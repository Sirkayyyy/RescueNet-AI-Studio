import React from 'react';
import { useAuth } from '../context/AuthContext.js';
import { useSocket } from '../context/SocketContext.js';
import { useLocation } from '../context/LocationContext.js';
import { ShieldAlert, Map, AlertTriangle, Bot, User, LogOut, Radio, Shield, Settings, MapPin } from 'lucide-react';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export default function Navbar({ activeTab, setActiveTab }: NavbarProps) {
  const { user, logout, quickLogin } = useAuth();
  const socket = useSocket();
  const { currentLocation, setIsLocationModalOpen } = useLocation();

  return (
    <header className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur-md border-b border-slate-800/80 px-4 py-2.5">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        {/* Brand */}
        <div
          className="flex items-center gap-3 cursor-pointer select-none"
          onClick={() => setActiveTab(user?.role === 'RESPONDER' ? 'responder' : user?.role === 'ADMIN' ? 'admin' : 'sos')}
        >
          <div className="p-2 bg-red-600/20 border border-red-500/40 rounded-xl shadow-inner">
            <ShieldAlert className="w-5 h-5 text-red-500 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-lg tracking-wider text-white">RESCUENET</span>
              <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-red-950/80 text-red-400 border border-red-800/50 px-1.5 py-0.5 rounded">
                AI DISPATCH
              </span>
            </div>
            <div className="text-[10px] uppercase tracking-widest font-semibold text-slate-400 flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${socket?.connected ? 'bg-emerald-500' : 'bg-amber-500 animate-ping'}`} />
              {socket?.connected ? 'Live Grid Active' : 'Connecting Grid...'}
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        {user && (
          <div className="flex items-center gap-1 md:gap-2">
            <nav className="flex items-center gap-1">
              {user.role === 'USER' && (
                <button
                  onClick={() => setActiveTab('sos')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                    activeTab === 'sos'
                      ? 'bg-red-600 text-white shadow-lg shadow-red-900/40'
                      : 'text-slate-300 hover:bg-slate-800/80'
                  }`}
                >
                  <Radio className="w-3.5 h-3.5" />
                  <span>SOS</span>
                </button>
              )}

              {user.role === 'RESPONDER' && (
                <button
                  onClick={() => setActiveTab('responder')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                    activeTab === 'responder'
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40'
                      : 'text-slate-300 hover:bg-slate-800/80'
                  }`}
                >
                  <Radio className="w-3.5 h-3.5 text-blue-300 animate-pulse" />
                  <span>Responder Console</span>
                </button>
              )}

              {user.role === 'ADMIN' && (
                <button
                  onClick={() => setActiveTab('admin')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                    activeTab === 'admin'
                      ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/40'
                      : 'text-slate-300 hover:bg-slate-800/80'
                  }`}
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span>Admin Control</span>
                </button>
              )}

              <button
                onClick={() => setActiveTab('map')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  activeTab === 'map'
                    ? 'bg-slate-700 text-white'
                    : 'text-slate-300 hover:bg-slate-800/80'
                }`}
              >
                <Map className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Tactical Map</span>
              </button>

              <button
                onClick={() => setActiveTab('alerts')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  activeTab === 'alerts'
                    ? 'bg-amber-600 text-white'
                    : 'text-slate-300 hover:bg-slate-800/80'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Alerts</span>
              </button>

              <button
                onClick={() => setActiveTab('ai')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  activeTab === 'ai'
                    ? 'bg-purple-600 text-white'
                    : 'text-slate-300 hover:bg-slate-800/80'
                }`}
              >
                <Bot className="w-3.5 h-3.5" />
                <span>AI Triage</span>
              </button>
            </nav>

            <div className="h-5 w-px bg-slate-800 mx-1 hidden sm:block" />

            {/* Location Selector Button */}
            <button
              onClick={() => setIsLocationModalOpen(true)}
              className="px-2.5 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-xs font-semibold text-slate-300 transition flex items-center gap-1.5 cursor-pointer max-w-[150px] sm:max-w-[200px]"
              title="Change your current operational location (Nigeria / Global)"
            >
              <MapPin className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
              <span className="truncate text-[11px] text-white font-bold">{currentLocation.name.split(' (')[0]}</span>
              <span className="text-[9px] uppercase px-1 py-0.2 rounded bg-emerald-950 text-emerald-400 font-black border border-emerald-800/80 hidden sm:inline">
                {currentLocation.country}
              </span>
            </button>

            {/* Quick Role Switcher for seamless multi-user testing */}
            <div className="hidden lg:flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-[10px] font-bold">
              <span className="text-slate-500 px-1">Switch:</span>
              <button
                onClick={() => quickLogin('CITIZEN')}
                className={`px-2 py-0.5 rounded transition ${user.role === 'USER' ? 'bg-red-600 text-white' : 'text-slate-400 hover:text-white'}`}
                title="Switch to Citizen Account"
              >
                Citizen
              </button>
              <button
                onClick={() => quickLogin('RESPONDER')}
                className={`px-2 py-0.5 rounded transition ${user.role === 'RESPONDER' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
                title="Switch to Certified Responder Account"
              >
                Responder
              </button>
              <button
                onClick={() => quickLogin('ADMIN')}
                className={`px-2 py-0.5 rounded transition ${user.role === 'ADMIN' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'}`}
                title="Switch to System Admin Account"
              >
                Admin
              </button>
            </div>

            {/* Profile & Logout */}
            <button
              onClick={() => setActiveTab('profile')}
              className={`p-2 rounded-xl text-xs font-semibold transition border ${
                activeTab === 'profile'
                  ? 'bg-slate-800 text-white border-slate-700'
                  : 'text-slate-300 hover:bg-slate-800/80 border-transparent'
              }`}
              title="Profile & Contacts"
            >
              <User className="w-4 h-4" />
            </button>

            <button
              onClick={logout}
              className="p-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-red-400 hover:bg-slate-800/80 transition"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
