import { useState, useRef, useEffect } from 'react';
import { FileText, UploadCloud, Clipboard, Download, MessageSquare, Send, X } from 'lucide-react';
import { analyzePdf, chatWithVideo } from '../services/api.jsx';
import ReactMarkdown from 'react-markdown';
import toast from 'react-hot-toast';

function PdfAnalysisResult({ session, onReset }) {
  const [tab, setTab] = useState('summary');
  const [copied, setCopied] = useState(false);
  
  // Chat state
  const [messages, setMessages] = useState([
    { role: 'assistant', content: "Hi! I've read your PDF. What would you like to know?" }
  ]);
  const [input, setInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const copy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Copied to clipboard');
  };

  const downloadSummary = () => {
    const blob = new Blob([session.summary], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${session.title || 'pdf'}_summary.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || chatLoading) return;
    const q = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: q }]);
    setChatLoading(true);
    try {
      // The backend /api/pdf/chat just wraps /api/chat so we can use chatWithVideo logic
      const res = await chatWithVideo(session.session_id, q);
      setMessages(prev => [...prev, { role: 'assistant', content: res.answer }]);
    } catch (err) {
      toast.error('Chat failed. Please try again.');
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', textAlign: 'left', paddingTop: 20 }}>
      {/* Header / Info Card */}
      <div className="card" style={{ marginBottom: 24, padding: 20, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 600, color: 'var(--text)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileText size={20} color="var(--primary)" />
            {session.title || 'Uploaded PDF'}
          </h2>
          <div style={{ display: 'flex', gap: 16, fontSize: 13, color: 'var(--text-subtle)' }}>
            <span>Analyzed on {new Date(session.created_at).toLocaleDateString()}</span>
          </div>
        </div>
        <button className="btn btn-ghost" onClick={onReset} style={{ color: 'var(--text-subtle)' }}>
          <X size={18} />
        </button>
      </div>

      {/* Tabs */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 220px)', minHeight: 500 }}>
        <div className="tabs" style={{ padding: '0 4px', background: 'var(--white)', borderBottom: '1px solid var(--border)' }}>
          <button className={`tab-btn${tab === 'summary' ? ' active' : ''}`} onClick={() => setTab('summary')}>
            <span className="flex items-center gap-2"><FileText size={13} /> Summary</span>
          </button>
          <button className={`tab-btn${tab === 'text' ? ' active' : ''}`} onClick={() => setTab('text')}>
            <span className="flex items-center gap-2"><FileText size={13} /> Extracted Text</span>
          </button>
          <button className={`tab-btn${tab === 'chat' ? ' active' : ''}`} onClick={() => setTab('chat')}>
            <span className="flex items-center gap-2"><MessageSquare size={13} /> PDF Chat</span>
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 24, background: tab === 'chat' ? 'var(--surface)' : 'var(--white)' }}>
          {tab === 'summary' && (
            <div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 20, justifyContent: 'flex-end' }}>
                <button className="btn btn-ghost btn-sm" onClick={() => copy(session.summary)}>
                  <Clipboard size={14} /> Copy
                </button>
                <button className="btn btn-ghost btn-sm" onClick={downloadSummary}>
                  <Download size={14} /> Download
                </button>
              </div>
              <div className="prose">
                <ReactMarkdown>{session.summary}</ReactMarkdown>
              </div>
            </div>
          )}

          {tab === 'text' && (
            <div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 20, justifyContent: 'flex-end' }}>
                <button className="btn btn-ghost btn-sm" onClick={() => copy(session.transcript)}>
                  <Clipboard size={14} /> Copy
                </button>
              </div>
              <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: 14, color: 'var(--text)', background: 'var(--surface)', padding: 16, borderRadius: 8 }}>
                {session.transcript}
              </pre>
            </div>
          )}

          {tab === 'chat' && (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div style={{ flex: 1, overflowY: 'auto', marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
                {messages.map((m, i) => (
                  <div key={i} style={{
                    alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                    background: m.role === 'user' ? 'var(--primary)' : 'var(--white)',
                    color: m.role === 'user' ? 'white' : 'var(--text)',
                    padding: '12px 16px',
                    borderRadius: 12,
                    border: m.role === 'assistant' ? '1px solid var(--border)' : 'none',
                    maxWidth: '85%'
                  }}>
                    {m.role === 'user' ? m.content : <div className="prose"><ReactMarkdown>{m.content}</ReactMarkdown></div>}
                  </div>
                ))}
                {chatLoading && (
                  <div style={{ alignSelf: 'flex-start', background: 'var(--white)', padding: '12px 16px', borderRadius: 12, border: '1px solid var(--border)' }}>
                    <div className="spinner spinner-sm" />
                  </div>
                )}
                <div ref={bottomRef} />
              </div>
              <form onSubmit={handleSend} style={{ display: 'flex', gap: 8 }}>
                <input
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  placeholder="Ask a question about the PDF..."
                  disabled={chatLoading}
                  style={{ flex: 1, padding: '12px 16px', border: '1px solid var(--border)', borderRadius: 24, outline: 'none' }}
                />
                <button type="submit" disabled={!input.trim() || chatLoading} style={{ background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '50%', width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                  <Send size={18} />
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function PdfAnalysis() {
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [session, setSession] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0];
    validateAndSetFile(selected);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const selected = e.dataTransfer.files?.[0];
    validateAndSetFile(selected);
  };

  const validateAndSetFile = (selected) => {
    if (!selected) return;
    if (selected.type !== 'application/pdf') {
      toast.error('Invalid file format. Please upload a PDF.');
      return;
    }
    if (selected.size > 20 * 1024 * 1024) {
      toast.error('File size exceeds 20MB limit.');
      return;
    }
    setFile(selected);
  };

  const handleUpload = async () => {
    if (!file) return;
    setIsLoading(true);
    try {
      const result = await analyzePdf(file);
      setSession(result);
      toast.success('PDF processed successfully!');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to process PDF.');
    } finally {
      setIsLoading(false);
    }
  };

  if (session) {
    return <PdfAnalysisResult session={session} onReset={() => { setSession(null); setFile(null); }} />;
  }

  return (
    <div className="page-wrapper" style={{ maxWidth: 640, textAlign: 'center', paddingTop: 60 }}>
      <div style={{ marginBottom: 40 }}>
        <h1 style={{ fontSize: 32, fontWeight: 700, color: 'var(--text)', marginBottom: 12 }}>
          QuickNotes AI for PDF
        </h1>
        <p style={{ fontSize: 15, color: 'var(--text-muted)' }}>
          Transform lengthy PDFs into smart summaries and chat instantly.
        </p>
      </div>

      <div 
        className="card"
        style={{ 
          padding: 40, 
          border: isDragging ? '2px dashed var(--primary)' : '2px dashed var(--border)',
          background: isDragging ? 'rgba(37, 99, 235, 0.02)' : 'var(--white)',
          cursor: 'pointer',
          transition: 'all 0.2s'
        }}
        onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          accept="application/pdf" 
          style={{ display: 'none' }} 
        />
        
        {isLoading ? (
          <div>
            <div className="spinner" style={{ width: 40, height: 40, borderWidth: 3, margin: '0 auto 16px' }} />
            <p style={{ fontWeight: 600, fontSize: 16 }}>Analyzing PDF Document...</p>
            <p style={{ color: 'var(--text-subtle)', fontSize: 13, marginTop: 8 }}>Extracting text and generating summary.</p>
          </div>
        ) : file ? (
          <div>
            <FileText size={48} color="var(--primary)" style={{ margin: '0 auto 16px' }} />
            <p style={{ fontWeight: 600, fontSize: 16, marginBottom: 8 }}>{file.name}</p>
            <p style={{ color: 'var(--text-subtle)', fontSize: 13 }}>{(file.size / 1024 / 1024).toFixed(2)} MB</p>
            <button 
              className="btn btn-primary" 
              style={{ marginTop: 24, padding: '10px 32px' }}
              onClick={(e) => { e.stopPropagation(); handleUpload(); }}
            >
              Generate Summary
            </button>
          </div>
        ) : (
          <div>
            <UploadCloud size={48} color="var(--text-muted)" style={{ margin: '0 auto 16px' }} />
            <p style={{ fontWeight: 600, fontSize: 16, marginBottom: 8, color: 'var(--text)' }}>
              Click or drag a PDF to upload
            </p>
            <p style={{ color: 'var(--text-subtle)', fontSize: 13 }}>
              Supported formats: PDF (Max 20MB)
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
