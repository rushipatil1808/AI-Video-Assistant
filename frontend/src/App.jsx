import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { SessionProvider } from './hooks/useSessionStore.jsx';
import Layout from './components/layout/Layout';
import Dashboard from './pages/Dashboard';
import VideoAnalysis from './pages/VideoAnalysis';
import Chat from './pages/Chat';
import Library from './pages/Library';
import KnowledgeBase from './pages/KnowledgeBase';
import Search from './pages/Search';
import Settings from './pages/Settings';

const qc = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 60_000 } },
});

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <SessionProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/analysis" element={<VideoAnalysis />} />
              <Route path="/analysis/:id" element={<VideoAnalysis />} />
              <Route path="/chat" element={<Chat />} />
              <Route path="/library" element={<Library />} />
              <Route path="/knowledge" element={<KnowledgeBase />} />
              <Route path="/search" element={<Search />} />
              <Route path="/settings" element={<Settings />} />
            </Route>
          </Routes>
        </BrowserRouter>
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: '#0F172A', color: '#F8FAFC',
              border: '1px solid #1E293B', borderRadius: 8,
              fontSize: 13, fontFamily: 'Inter, system-ui, sans-serif',
            },
            success: { iconTheme: { primary: '#10B981', secondary: '#0F172A' } },
            error: { iconTheme: { primary: '#EF4444', secondary: '#0F172A' } },
          }}
        />
      </SessionProvider>
    </QueryClientProvider>
  );
}


