import yt_dlp
import os
import re
import subprocess
import uuid
from dotenv import load_dotenv

load_dotenv()

DOWNLOAD_DIR = 'downloades'
os.makedirs(DOWNLOAD_DIR,exist_ok = True)

def sanitize_filename(filename: str) -> str:
    """Remove/replace characters invalid on Windows file paths."""
    dir_part = os.path.dirname(filename)
    base = os.path.basename(filename)
    base = re.sub(r'[\\/:*?"<>|\uff5c\uff1a]', '_', base)
    return os.path.join(dir_part, base)


def download_youtube_audio(url: str) -> str:
    output_path = os.path.join(DOWNLOAD_DIR, "%(id)s.%(ext)s")

    ydl_opts = {
        "format": "bestaudio[ext=m4a]/bestaudio",
        "outtmpl": output_path,
        "quiet": False,
        "restrictfilenames": True,
    }

    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(url, download=True)
        filename = ydl.prepare_filename(info)

    return convert_to_wav_ffmpeg(filename)


def get_ffmpeg_path() -> str:
    """Return a subprocess-safe ffmpeg executable path."""
    ffmpeg_path = os.getenv("FFMPEG_PATH", "ffmpeg").strip().strip('"').strip("'")
    if ffmpeg_path.lower().endswith(".exe") and not os.path.exists(ffmpeg_path):
        raise FileNotFoundError(f"FFmpeg executable not found: {ffmpeg_path}")
    return ffmpeg_path


def convert_to_wav_ffmpeg(input_path: str) -> str:
    """Convert any audio/video file to WAV using ffmpeg directly."""
    input_path = os.path.normpath(input_path.strip().strip('"').strip("'"))
    if not os.path.exists(input_path):
        raise FileNotFoundError(f"Input media file not found: {input_path}")

    ffmpeg_path = get_ffmpeg_path()
    root, _ = os.path.splitext(input_path)
    output_path = f"{sanitize_filename(root)}_converted.wav"
    
    cmd = [
        ffmpeg_path,
        '-i', input_path,
        '-ar', '16000',
        '-ac', '1',
        '-y',
        output_path
    ]
    
    print(f"Converting to WAV: {input_path}")
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8')
    except OSError as exc:
        raise RuntimeError(f"Could not start FFmpeg with path '{ffmpeg_path}': {exc}") from exc
    
    if result.returncode != 0:
        raise RuntimeError(f"FFmpeg conversion failed: {result.stderr}")
    
    if os.path.exists(input_path) and input_path != output_path:
        os.remove(input_path)
    
    return output_path


def convert_to_wav(input_path: str) -> str:
    """Convert any audio/video file to WAV format using pydub."""
    return convert_to_wav_ffmpeg(input_path)



def chunk_audio(wav_path : str , chunk_minutes : int = 10) -> list:
    wav_path = os.path.normpath(wav_path.strip().strip('"').strip("'"))
    if not os.path.exists(wav_path):
        raise FileNotFoundError(f"WAV file not found for chunking: {wav_path}")

    ffmpeg_path = get_ffmpeg_path()
    
    # Get audio duration using ffmpeg
    cmd = [
        ffmpeg_path,
        '-i', wav_path,
        '-f', 'null',
        '-'
    ]
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8')
    except OSError as exc:
        raise RuntimeError(f"Could not start FFmpeg with path '{ffmpeg_path}': {exc}") from exc
    
    # Parse duration from ffmpeg output (in stderr)
    duration_sec = 0
    for line in result.stderr.split('\n'):
        if 'Duration:' in line:
            time_str = line.split('Duration:')[1].split(',')[0].strip()
            h, m, s = time_str.split(':')
            duration_sec = int(h) * 3600 + int(m) * 60 + float(s)
            break
    
    if duration_sec < 1:
        return [wav_path]
    
    chunk_sec = chunk_minutes * 60
    chunks = []
    
    for i, start in enumerate(range(0, int(duration_sec), chunk_sec)):
        end = min(start + chunk_sec, duration_sec)
        if end - start < 1:
            continue
            
        chunk_path = os.path.join(
            os.path.dirname(wav_path),
            f"{os.path.splitext(os.path.basename(wav_path))[0]}_chunk_{i}_{uuid.uuid4().hex[:8]}.wav",
        )
        cmd = [
            ffmpeg_path,
            '-i', wav_path,
            '-ss', str(start),
            '-t', str(end - start),
            '-ar', '16000',
            '-ac', '1',
            '-y',
            chunk_path
        ]
        result = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8')
        if result.returncode != 0:
            raise RuntimeError(f"FFmpeg chunking failed: {result.stderr}")
        chunks.append(chunk_path)
    
    return chunks if chunks else [wav_path]

def process_input(source: str) -> list:
    if source.startswith("http://") or source.startswith("https://"):
        print("Detected YouTube URL. Downloading audio...")
        wav_path = download_youtube_audio(source)
    else:
        print("Detected local file. Converting to WAV...")
        wav_path = convert_to_wav(source)

    print("Chunking audio...")
    chunks = chunk_audio(wav_path)
    print(f"Audio ready — {len(chunks)} chunk(s) created.")
    return chunks


