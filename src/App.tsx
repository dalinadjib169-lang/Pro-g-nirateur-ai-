import React, { Component, ErrorInfo, ReactNode } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { DownloadsProvider } from './contexts/DownloadsContext';
import GeneratorPage from './pages/GeneratorPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import AdminDashboard from './pages/AdminDashboard';
import { AlertCircle } from 'lucide-react';
import LoadingScreen from './components/LoadingScreen';
import { TeachersRoom } from './components/TeachersRoom';
import { InstallPWA } from './components/InstallPWA';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null };

  constructor(props: ErrorBoundaryProps) {
    super(props);
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4" dir="rtl">
          <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-slate-800 mb-2">عذراً، حدث خطأ غير متوقع</h2>
            <p className="text-slate-600 mb-6">يرجى تحديث الصفحة والمحاولة مرة أخرى.</p>
            <button 
              onClick={() => window.location.href = '/'}
              className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
            >
              العودة للرئيسية
            </button>
            {this.state.error && (
              <div className="mt-6 p-4 bg-slate-100 rounded text-left overflow-auto text-xs text-slate-500 max-h-32" dir="ltr">
                {this.state.error.toString()}
              </div>
            )}
          </div>
        </div>
      );
    }
    return (this as any).props.children;
  }
}

const ProtectedRoute = ({ children, requireAdmin = false }: { children: React.ReactNode, requireAdmin?: boolean }) => {
  const { user, userData, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!user || !userData) {
    return <Navigate to="/login" />;
  }

  if (requireAdmin && userData.role !== 'admin' && userData.email !== 'dalinadjib1990@gmail.com') {
    return <Navigate to="/" />;
  }

  return <>{children}</>;
};

import { CompleteProfileModal } from './components/CompleteProfileModal';
import { ExpertChat } from './components/ExpertChat';

// Add export event emitter for expert chat
export const expertChatEmitter = new EventTarget();
export const profileModalEmitter = new EventTarget();

function AppRoutes() {
  const [isExpertChatOpen, setIsExpertChatOpen] = React.useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = React.useState(false);

  React.useEffect(() => {
    const handleExpertOpen = () => setIsExpertChatOpen(true);
    const handleProfileOpen = () => setIsProfileModalOpen(true);
    expertChatEmitter.addEventListener('open', handleExpertOpen);
    profileModalEmitter.addEventListener('open', handleProfileOpen);
    return () => {
      expertChatEmitter.removeEventListener('open', handleExpertOpen);
      profileModalEmitter.removeEventListener('open', handleProfileOpen);
    }
  }, []);

  return (
    <>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route 
          path="/" 
          element={
            <ProtectedRoute>
              <GeneratorPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin" 
          element={
            <ProtectedRoute requireAdmin={true}>
              <AdminDashboard />
            </ProtectedRoute>
          } 
        />
      </Routes>
      <TeachersRoom />
      <ExpertChat isOpen={isExpertChatOpen} onClose={() => setIsExpertChatOpen(false)} />
      <CompleteProfileModal isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} />
      <InstallPWA />
    </>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <DownloadsProvider>
          <Router>
            <AppRoutes />
          </Router>
        </DownloadsProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
