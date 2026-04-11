import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { SubscriptionProvider } from './hooks/useSubscription';
import { ErrorBoundary } from './components/ErrorBoundary';
import ChatLayout from './components/ChatLayout';
import Chat from './pages/Chat';
import Today from './pages/Today';
import Portfolio from './pages/Portfolio';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';
import Auth from './pages/Auth';
import ResetPassword from './pages/ResetPassword';
import StackSignal from './pages/StackSignal';
import CompareDealers from './pages/CompareDealers';
import VaultWatch from './pages/VaultWatch';
import SpeculationCalculator from './pages/SpeculationCalculator';
import JunkSilver from './pages/JunkSilver';
import Developers from './pages/Developers';
import DeveloperKeys from './pages/DeveloperKeys';

function App() {
  return (
    <AuthProvider>
      <SubscriptionProvider>
        <ErrorBoundary>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/" element={<ChatLayout />}>
              <Route index element={<Chat />} />
              <Route path="c/:conversationId" element={<Chat />} />
              <Route path="dashboard" element={<Today />} />
              <Route path="stack" element={<Portfolio />} />
              <Route path="portfolio" element={<Navigate to="/stack" replace />} />
              <Route path="analytics" element={<Analytics />} />
              <Route path="signal" element={<StackSignal />} />
              <Route path="vault" element={<VaultWatch />} />
              <Route path="dealers" element={<CompareDealers />} />
              <Route path="speculate" element={<SpeculationCalculator />} />
              <Route path="junk-silver" element={<JunkSilver />} />
              <Route path="developers" element={<Developers />} />
              <Route path="developers/keys" element={<DeveloperKeys />} />
              <Route path="settings" element={<Settings />} />
            </Route>
          </Routes>
        </ErrorBoundary>
      </SubscriptionProvider>
    </AuthProvider>
  );
}

export default App;
