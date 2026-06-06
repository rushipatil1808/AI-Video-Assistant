<div align="center">
  <img src="https://img.shields.io/badge/Status-Active-success.svg" alt="Status Active" />
  <img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License MIT" />
  <img src="https://img.shields.io/badge/Version-1.0.0-informational.svg" alt="Version 1.0.0" />

  <h1>🚀 QuickNotes AI</h1>
  <p><b>Transform Videos and PDFs into Smart Notes</b></p>
</div>

---

## 📖 Project Overview

**QuickNotes AI** is an advanced AI-powered assistant designed to transform the way users interact with educational and professional content. It seamlessly extracts transcripts from YouTube videos and content from PDF documents, utilizing state-of-the-art AI models to generate comprehensive summaries, action items, key decisions, and open questions. 

**The Problem It Solves:** Consuming hour-long videos or massive PDF documents to extract key information is time-consuming and inefficient. 
**The Solution:** QuickNotes AI automates the summarization and information extraction process, allowing users to converse dynamically with the content via a powerful Retrieval-Augmented Generation (RAG) chat interface.
**User Benefit:** Saves hours of manual note-taking, accelerates learning, improves productivity, and provides instantaneous answers to specific questions based directly on the provided context.

---

## ✨ Features

- 📹 **YouTube Video Analysis**: Paste any YouTube URL to instantly download and process its audio.
- 📝 **Transcript Extraction**: Highly accurate local speech-to-text transcript generation.
- 🧠 **AI Summary Generation**: Get concise summaries, structured action items, and critical decisions using optimized AI prompts.
- 🤖 **Video Chat Assistant**: A context-aware chatbot that answers questions based purely on the analyzed video's transcript.
- 📄 **PDF Analysis**: Upload any PDF document for deep text extraction and structuring.
- 📑 **PDF Summary Generation**: AI-generated smart notes directly extracted from dense documents.
- 💬 **PDF Chat Assistant**: Ask detailed questions and get precise answers backed by the document's content.
- 💻 **Responsive UI**: A beautiful, fast, and intuitive user interface built for modern browsers.

---

## 🛠️ Tech Stack

### Frontend Technologies
- **React.js** (via Vite)
- **React Router** for seamless SPA navigation
- **React Query** for robust state and data fetching management

### Backend Technologies
- **Python 3.10+**
- **FastAPI** for high-performance async API endpoints
- **Uvicorn** as the ASGI server
- **LangChain** for orchestrating the LLM and RAG pipelines

### AI & Data Processing
- **AI Model Used**: Optimized **Gemini** prompts (alongside HuggingFace Embeddings for vectorization)
- **Local Transcriber**: Whisper (OpenAI) / `yt-dlp` for YouTube audio
- **PDF Processing**: `pdfplumber` & `PyPDF2`

### Database
- **ChromaDB**: Local vector database for extremely fast semantic similarity search and RAG capabilities.
- **SQLite**: For session and metadata storage.

---

## 🧠 AI Model Explanation

- **Model Selection**: QuickNotes AI primarily leverages optimized prompts tailored for large language models (like Gemini) via the LangChain framework. It provides a perfect balance of deep reasoning, large context window management, and fast inference times.
- **Prompt Engineering**: The backend utilizes precise system prompts structured to strictly enforce the output format (Summary, Action Items, Key Decisions) avoiding hallucination and strictly adhering to the source transcript or document context.
- **Summary Generation**: Once the transcript or PDF text is extracted, it is chunked and fed into the AI model. The model reads the context and returns a highly structured JSON or Markdown response summarizing the core concepts.
- **Chat Responses (RAG)**: The transcript/text is converted into vector embeddings using `SentenceTransformers` (HuggingFace) and stored in ChromaDB. When a user asks a question, the system queries the vector database for the most relevant text chunks, prepends them to the chat prompt, and the AI generates a contextually accurate response.

---

## 🏗️ System Architecture

```text
+-------------------+       HTTP / REST        +-----------------------+
|                   |  (JSON/Multipart)        |                       |
|   Frontend (UI)   +------------------------->+   FastAPI Backend     |
|   (React + Vite)  |                          |                       |
|                   +<-------------------------+                       |
+--------+----------+       JSON Responses     +-----------+-----------+
         |                                                 |
         |                                                 |
         |         +-------------------------+             |
         |         |  Audio/PDF Extraction   |<------------+
         +-------->|  (yt-dlp, Whisper,      |
                   |   pdfplumber)           |
                   +-----------+-------------+
                               |
                               v
                   +-----------+-------------+
                   |    LangChain Engine     |
                   |  (Chunking & Prompting) |
                   +-----------+-------------+
                               |
                   +-----------+-------------+
                   |                         |
                   v                         v
        +-------------------+      +-------------------+
        | ChromaDB (Vector) |      |     AI Model      |
        |  (Embeddings)     |<---->| (Gemini / LLM)    |
        +-------------------+      +-------------------+
```

---

## 🔄 Complete Workflow

### 1. YouTube Analysis Workflow
1. User pastes a YouTube URL into the Dashboard.
2. The Frontend sends the URL to the `/api/analyze` endpoint.
3. Backend utilizes `yt-dlp` to download the audio track.
4. Audio is passed through a local Whisper model to extract a highly accurate text transcript.
5. The transcript is sent to the LLM to generate the title, summary, and key action items.
6. The transcript is chunked, vectorized, and stored in ChromaDB.
7. The structured JSON summary is returned to the Frontend and displayed.

### 2. PDF Analysis Workflow
1. User uploads a PDF file via the UI.
2. The Frontend sends the file as `multipart/form-data` to the `/api/pdf` endpoint.
3. Backend processes the PDF using `pdfplumber`/`PyPDF2` to extract raw text pages.
4. Extracted text is fed into the LLM for summarization.
5. Text chunks are vectorized and stored in ChromaDB for querying.
6. The user is redirected to the PDF summary view.

### 3. Chat Workflow (RAG)
1. User types a question in the Chat interface.
2. The question is sent to the `/api/chat` endpoint along with the `session_id`.
3. Backend converts the question into an embedding.
4. ChromaDB performs a semantic similarity search to find the top `K` most relevant chunks from the video/PDF.
5. These chunks are injected into a strict prompt template alongside the user's question.
6. The LLM processes the prompt and returns an accurate, context-aware answer.

---

## 📁 Folder Structure

```text
QuickNotes-AI/
├── backend/
│   ├── api_server.py       # Main FastAPI application server
│   ├── api.py              # API endpoint route definitions
│   ├── core/               # Core business logic (RAG, Transcriber, Summarizer)
│   ├── utils/              # Helper functions (Audio processing, DB)
│   ├── chroma_db/          # Local vector database storage
│   └── database.db         # SQLite database for sessions
├── frontend/
│   ├── src/
│   │   ├── components/     # Reusable React components
│   │   ├── pages/          # Main application views (Dashboard, Chat, PDF)
│   │   ├── hooks/          # Custom React hooks (useSessionStore)
│   │   ├── services/       # API integration (Axios)
│   │   ├── index.css       # Global styling and design system
│   │   └── App.jsx         # Application routing
│   ├── package.json        # Frontend dependencies
│   └── vite.config.js      # Vite bundler configuration
├── main.py                 # CLI interface for local testing
├── Requirements.txt        # Python backend dependencies
└── README.md               # Project documentation
```

---

## 🔌 API Endpoints

### `POST /api/sessions`
- **Description**: Creates a new video analysis session from a URL.
- **Payload**: `{ "url": "https://youtube.com/watch?v=..." }`
- **Response**: `{ "session_id": "uuid", "title": "...", "summary": "...", "action_items": [] }`

### `POST /api/upload-pdf`
- **Description**: Uploads and processes a PDF file.
- **Payload**: `multipart/form-data` containing the `file`.
- **Response**: `{ "session_id": "uuid", "title": "FileName", "summary": "..." }`

### `POST /api/chat`
- **Description**: Ask a question against a specific session context.
- **Payload**: `{ "session_id": "uuid", "question": "What were the key decisions?" }`
- **Response**: `{ "answer": "The key decisions were..." }`

### `GET /api/sessions`
- **Description**: Fetch all historical user sessions.
- **Response**: `[ { "session_id": "uuid", "title": "...", "type": "video|pdf", "created_at": "..." } ]`

---

## ⚙️ Installation Guide

### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/QuickNotes-AI.git
cd QuickNotes-AI
```

### 2. Backend Setup
Ensure you have Python 3.10+ installed.
```bash
# Create a virtual environment
python -m venv venv
source venv/bin/activate  # On Windows use: venv\Scripts\activate

# Install dependencies
pip install -r Requirements.txt

# Setup Environment Variables
cp .env.example .env
# Edit .env and add your LLM API Keys (e.g., GEMINI_API_KEY)
```

### 3. Frontend Setup
Ensure you have Node.js installed.
```bash
cd frontend

# Install dependencies
npm install

# Start the Vite development server
npm run dev
```

### 4. Run the Application
Start the backend server:
```bash
cd backend
python api_server.py
```
Your application will now be running at `http://localhost:5173` (Frontend) and `http://localhost:8000` (Backend).

---

## ⚡ Performance Optimizations

- **Transcript & Summary Caching**: Prevents redundant processing of previously analyzed videos by caching results in the SQLite database mapped to the video hash.
- **Async Processing**: FastApi utilizes asynchronous workers to prevent blocking the main thread during heavy PDF extraction or whisper transcription.
- **Optimized Gemini Prompts**: Prompts are aggressively tuned to consume fewer tokens while generating strict JSON structures, reducing latency and cost.
- **Vector Search Tuning**: ChromaDB queries are optimized to fetch only the top 3 most dense contextual chunks, maximizing RAG efficiency.

---

## 📸 Screenshots

### Dashboard
*(Add your Dashboard screenshot here)*
`![Dashboard Placeholder](./docs/dashboard.png)`

### Video Analysis Page
*(Add your Video Analysis screenshot here)*
`![Video Analysis Placeholder](./docs/video-analysis.png)`

### PDF Document Analysis
*(Add your PDF Analysis screenshot here)*
`![PDF Analysis Placeholder](./docs/pdf-analysis.png)`

### AI Chat Assistant
*(Add your Chat Interface screenshot here)*
`![Chat Interface Placeholder](./docs/chat-ui.png)`

---

## 🚀 Future Enhancements

- [ ] **Export Summary**: Ability to export generated notes directly to PDF or Notion.
- [ ] **Multi-language Support**: Summarize and chat with videos in multiple global languages in real-time.
- [ ] **Downloadable Notes**: Offline access to cached sessions.
- [ ] **Timestamped Citations**: Chatbot responses will include exact timestamps linked to the YouTube video for quick verification.

---

## 👨‍💻 Author

**QuickNotes AI** was conceptualized and developed to bridge the gap between heavy media consumption and actionable productivity. Built with a passion for modern web technologies and Artificial Intelligence. 

Open to contributions, feedback, and collaboration!

[![GitHub Profile](https://img.shields.io/badge/GitHub-Profile-181717?logo=github)](https://github.com/yourusername) 
[![LinkedIn Profile](https://img.shields.io/badge/LinkedIn-Profile-0A66C2?logo=linkedin)](https://linkedin.com/in/yourusername)

---
<p align="center">Made with ❤️ and AI.</p>
