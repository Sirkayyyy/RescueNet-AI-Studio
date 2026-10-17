import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.js';
import { SocketProvider } from './context/SocketContext.js';
import { LocationProvider } from './context/LocationContext.js';
import Navbar from './components/Navbar.js';
import LocationPickerModal from './components/LocationPickerModal.js';
import Auth from './pages/Auth.js';
import SosPage from './pages/SosPage.js';
import MapPage from './pages/MapPage.js';
import AlertsPage from './pages/AlertsPage.js';
import AiAssistantPage from './pages/AiAssistantPage.js';
import ProfilePage from './pages/ProfilePage.js';
import ResponderDashboard from './pages/ResponderDashboard.js';
import AdminDashboard from './pages/AdminDashboard.js';
import { Shield, UserCheck, ShieldAlert, Radio } from 'lucide-react';

function AppContent() {
  const { user, loading, quickLogin } = useAuth();
  const [activeTab, setActiveTab] = useState('sos');

  // Sync tab with role changes
  useEffect(() => {
    if (user?.role === 'RESPONDER') {
      setActiveTab('responder');
    } else if (user?.role === 'ADMIN') {
      setActiveTab('admin');
    } else if (user?.role === 'USER') {
      setActiveTab('sos');
    }
  }, [user?.role]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400 gap-3">
        <div className="w-9 h-9 border-3 border-red-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-bold tracking-widest uppercase text-slate-300">
          Initializing RescueNet Core...
        </span>
      </div>
    );
  }

  if (!user) {
    return <Auth />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col antialiased selection:bg-red-500 selection:text-white">
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />
      <LocationPickerModal />
      <main className="flex-1 pb-16 pt-3">
        {user.role === 'RESPONDER' && activeTab === 'responder' && <ResponderDashboard />}
        {user.role === 'ADMIN' && activeTab === 'admin' && <AdminDashboard />}

        {/* Universal Views */}
        {activeTab === 'sos' && <SosPage />}
        {activeTab === 'map' && <MapPage />}
        {activeTab === 'alerts' && <AlertsPage />}
        {activeTab === 'ai' && <AiAssistantPage />}
        {activeTab === 'profile' && <ProfilePage />}
      </main>

      {/* Floating Role Quick Switcher for seamless evaluation */}
      <div className="fixed bottom-3 right-3 z-50 bg-slate-900/90 backdrop-blur-md border border-slate-700/80 px-3 py-2 rounded-2xl shadow-2xl flex items-center gap-2">
        <span className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-1">
          <Radio className="w-3 h-3 text-red-500 animate-pulse" />
          Active: <strong className="text-white">{user.role}</strong>
        </span>
        <div className="h-3 w-px bg-slate-700" />
        <div className="flex items-center gap-1">
          <button
            onClick={() => quickLogin('CITIZEN')}
            className={`px-2 py-1 rounded-lg text-[10px] font-black transition cursor-pointer ${
              user.role === 'USER'
                ? 'bg-red-600 text-white shadow'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            Citizen
          </button>
          <button
            onClick={() => quickLogin('RESPONDER')}
            className={`px-2 py-1 rounded-lg text-[10px] font-black transition cursor-pointer ${
              user.role === 'RESPONDER'
                ? 'bg-blue-600 text-white shadow'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            Responder
          </button>
          <button
            onClick={() => quickLogin('ADMIN')}
            className={`px-2 py-1 rounded-lg text-[10px] font-black transition cursor-pointer ${
              user.role === 'ADMIN'
                ? 'bg-emerald-600 text-white shadow'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            Admin
          </button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <LocationProvider>
        <SocketProvider>
          <AppContent />
        </SocketProvider>
      </LocationProvider>
    </AuthProvider>
  );
}
