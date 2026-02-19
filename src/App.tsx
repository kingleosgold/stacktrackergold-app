import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { SubscriptionProvider } from './hooks/useSubscription';
import { ErrorBoundary } from './components/ErrorBoundary';
import Layout from './components/Layout';
import Today from './pages/Today';
import Portfolio from './pages/Portfolio';
import Analytics from './pages/Analytics';
import Tools from './pages/Tools';
import Settings from './pages/Settings';
import Auth from './pages/Auth';
import ResetPassword from './pages/ResetPassword';

function App() {
  return (
    <AuthProvider>
      <SubscriptionProvider>
      <ErrorBoundary>
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/" element={<Layout />}>
            <Route index element={<Today />} />
            <Route path="portfolio" element={<Portfolio />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="tools" element={<Tools />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Routes>
      </ErrorBoundary>
      </SubscriptionProvider>
    </AuthProvider>
  );
}

export default App;
