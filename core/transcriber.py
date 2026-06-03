import whisper
import os
import shutil
import requests
from pydub import AudioSegment
from dotenv import load_dotenv

load_dotenv()


def _ensure_ffmpeg_on_path() -> None:
    ffmpeg_path = os.getenv("FFMPEG_PATH", "").strip().strip('"').strip("'")
    if not ffmpeg_path or not os.path.exists(ffmpeg_path):
        return

    ffmpeg_dir = os.path.dirname(ffmpeg_path)
    ffmpeg_name = os.path.basename(ffmpeg_path).lower()
    path_entries = os.environ.get("PATH", "").split(os.pathsep)

    if ffmpeg_name == "ffmpeg.exe":
        if ffmpeg_dir not in path_entries:
            os.environ["PATH"] = ffmpeg_dir + os.pathsep + os.environ.get("PATH", "")
        return

    shim_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend", "bin"))
    os.makedirs(shim_dir, exist_ok=True)
    shim_path = os.path.join(shim_dir, "ffmpeg.exe")

    if not os.path.exists(shim_path):
        try:
            os.link(ffmpeg_path, shim_path)
        except OSError:
            shutil.copy2(ffmpeg_path, shim_path)

    if shim_dir not in path_entries:
        os.environ["PATH"] = shim_dir + os.pathsep + os.environ.get("PATH", "")


_ensure_ffmpeg_on_path()

# Sarvam's sync STT-translate API rejects audio longer than 30s.
# We slice each chunk into 25s pieces (with a 5s safety margin) before sending.
SARVAM_PIECE_SECONDS = 25


WHISPER_MODEL = os.getenv("WHISPER_MODEL", "small")


SARVAM_API_KEY = os.getenv("SARVAM_API_KEY")
SARVAM_STT_TRANSLATE_URL = "https://api.sarvam.ai/speech-to-text-translate"   # hinglish → english
SARVAM_STT_URL          = "https://api.sarvam.ai/speech-to-text"               # english → english
SARVAM_MODEL = os.getenv("SARVAM_STT_MODEL", "saaras:v2.5")

_model = None


def load_model():

    global _model  

    if _model is None: 
        print(f"Loading Whisper model: {WHISPER_MODEL} ...")
        _model = whisper.load_model(WHISPER_MODEL) 
        print("Whisper model loaded.")
    return _model 


def transcribe_chunk_whisper(chunk_path: str) -> str:

    model = load_model()  

    audio = AudioSegment.from_wav(chunk_path)
    if len(audio) < 100:
        print(f"Skipping empty/tiny chunk: {chunk_path}")
        return ""
    
    result = model.transcribe(chunk_path, task="transcribe")  
    return result["text"]  


def _send_to_sarvam(piece_path: str) -> str:
    """Send one ≤30s WAV to Sarvam STT-Translate (Hinglish→English)."""
    headers = {"api-subscription-key": SARVAM_API_KEY}
    with open(piece_path, "rb") as f:
        files = {"file": (os.path.basename(piece_path), f, "audio/wav")}
        data = {"model": SARVAM_MODEL, "with_diarization": "false"}
        response = requests.post(
            SARVAM_STT_TRANSLATE_URL,
            headers=headers,
            files=files,
            data=data,
            timeout=120,
        )
    if not response.ok:
        print(f"\n❌ Sarvam STT-Translate {response.status_code}: {response.text}\n")
        response.raise_for_status()
    return response.json().get("transcript", "")


def _send_to_sarvam_english(piece_path: str) -> str:
    """Send one ≤30s WAV to Sarvam STT (English→English, fast cloud)."""
    headers = {"api-subscription-key": SARVAM_API_KEY}
    with open(piece_path, "rb") as f:
        files = {"file": (os.path.basename(piece_path), f, "audio/wav")}
        data = {"model": SARVAM_MODEL, "language_code": "en-IN", "with_diarization": "false"}
        response = requests.post(
            SARVAM_STT_URL,
            headers=headers,
            files=files,
            data=data,
            timeout=120,
        )
    if not response.ok:
        print(f"\n❌ Sarvam STT {response.status_code}: {response.text}\n")
        response.raise_for_status()
    return response.json().get("transcript", "")


def transcribe_chunk_sarvam(chunk_path: str) -> str:
    """
    Sarvam sync API only accepts ≤30s audio. We split this chunk into
    25-second pieces, send each separately, and join the transcripts.
    """
    if not SARVAM_API_KEY:
        raise RuntimeError("SARVAM_API_KEY is not set in environment / .env")

    audio = AudioSegment.from_wav(chunk_path)
    piece_ms = SARVAM_PIECE_SECONDS * 1000

    full_text = ""
    total_pieces = (len(audio) + piece_ms - 1) // piece_ms

    for i, start in enumerate(range(0, len(audio), piece_ms)):
        piece = audio[start: start + piece_ms]
        piece_path = f"{chunk_path}_sv_{i}.wav"
        piece.export(piece_path, format="wav")

        try:
            print(f"  → Sarvam piece {i + 1}/{total_pieces} ...")
            full_text += _send_to_sarvam(piece_path) + " "
        finally:
            if os.path.exists(piece_path):
                os.remove(piece_path)

    return full_text.strip()

   



def transcribe_chunk_sarvam_english(chunk_path: str) -> str:
    """
    Use Sarvam STT (English→English) for fast cloud transcription.
    Splits into 25s pieces just like the Hinglish version.
    """
    if not SARVAM_API_KEY:
        raise RuntimeError("SARVAM_API_KEY is not set")

    audio = AudioSegment.from_wav(chunk_path)
    piece_ms = SARVAM_PIECE_SECONDS * 1000
    full_text = ""
    total_pieces = (len(audio) + piece_ms - 1) // piece_ms

    for i, start in enumerate(range(0, len(audio), piece_ms)):
        piece = audio[start: start + piece_ms]
        piece_path = f"{chunk_path}_en_{i}.wav"
        piece.export(piece_path, format="wav")
        try:
            print(f"  → Sarvam English piece {i + 1}/{total_pieces} ...")
            full_text += _send_to_sarvam_english(piece_path) + " "
        finally:
            if os.path.exists(piece_path):
                os.remove(piece_path)

    return full_text.strip()


def transcribe_chunk(chunk_path: str, language: str = "english") -> str:
    """
    Route one chunk to the best available engine:
    - english  → Sarvam cloud STT (fast) → fallback: local Whisper
    - hinglish → Sarvam STT-Translate    → fallback: local Whisper
    """
    if language.lower() == "hinglish":
        if SARVAM_API_KEY:
            try:
                return transcribe_chunk_sarvam(chunk_path)
            except Exception as e:
                print(f"Sarvam Hinglish failed ({e}), falling back to Whisper...")
                return transcribe_chunk_whisper(chunk_path)
        else:
            print("SARVAM_API_KEY missing, using Whisper for Hinglish.")
            return transcribe_chunk_whisper(chunk_path)

    # English — prefer fast Sarvam cloud, fall back to local Whisper
    if SARVAM_API_KEY:
        try:
            return transcribe_chunk_sarvam_english(chunk_path)
        except Exception as e:
            print(f"Sarvam English failed ({e}), falling back to Whisper...")
            return transcribe_chunk_whisper(chunk_path)

    return transcribe_chunk_whisper(chunk_path)


def transcribe_all(chunks: list, language: str = "english") -> str:

    full_transcript = ""

    if language.lower() == "hinglish":
        engine = "Sarvam AI (Hinglish→English)"
    elif SARVAM_API_KEY:
        engine = "Sarvam AI (English cloud)"
    else:
        engine = "Whisper (local CPU)"
    print(f"Using {engine} for transcription.")

    for i, chunk in enumerate(chunks):  

        print(f"Transcribing chunk {i + 1}/{len(chunks)}...")

        text = transcribe_chunk(chunk, language=language)  

        full_transcript += text + " "  

    print("Transcription complete.")

    return full_transcript.strip()  
