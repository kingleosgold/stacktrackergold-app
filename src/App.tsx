import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Holdings from './pages/Holdings';
import AddHolding from './pages/AddHolding';
import EditHolding from './pages/EditHolding';
import Settings from './pages/Settings';
import Auth from './pages/Auth';

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/auth" element={<Auth />} />
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="holdings" element={<Holdings />} />
          <Route path="add" element={<AddHolding />} />
          <Route path="edit/:id" element={<EditHolding />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}

export default App;
