import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { SessionProvider } from './hooks/useSessionStore.jsx';
import { Suspense, lazy } from 'react';
import Layout from './components/layout/Layout';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const VideoAnalysis = lazy(() => import('./pages/VideoAnalysis'));
const PdfAnalysis = lazy(() => import('./pages/PdfAnalysis'));
const Chat = lazy(() => import('./pages/Chat'));

export default function App() {
  return (
    <SessionProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Suspense fallback={<div className="p-4 text-center text-sm text-gray-500">Loading Dashboard...</div>}><Dashboard /></Suspense>} />
            <Route path="/analysis" element={<Suspense fallback={<div className="p-4 text-center text-sm text-gray-500">Loading Analysis...</div>}><VideoAnalysis /></Suspense>} />
            <Route path="/pdf" element={<Suspense fallback={<div className="p-4 text-center text-sm text-gray-500">Loading PDF Analysis...</div>}><PdfAnalysis /></Suspense>} />
            <Route path="/chat" element={<Suspense fallback={<div className="p-4 text-center text-sm text-gray-500">Loading Chat...</div>}><Chat /></Suspense>} />
          </Route>
        </Routes>
      </BrowserRouter>
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#fff',
            color: '#111827',
            border: '1px solid #E5E7EB',
            borderRadius: 8,
            fontSize: 13,
            fontFamily: 'Inter, system-ui, sans-serif',
          },
        }}
      />
    </SessionProvider>
  );
}
