import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { ShieldCheck, AlertCircle, ArrowRight, ShieldAlert } from 'lucide-react';
import { UserRole } from '../types.js';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<UserRole>('USER');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login, register } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await register({ name, email, password, role, phone });
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoFill = (demoRole: 'CITIZEN' | 'RESPONDER' | 'ADMIN') => {
    if (demoRole === 'CITIZEN') {
      setEmail('citizen@emergency.org');
      setPassword('password123');
    } else if (demoRole === 'RESPONDER') {
      setEmail('responder@emergency.org');
      setPassword('password123');
    } else if (demoRole === 'ADMIN') {
      setEmail('admin@emergency.org');
      setPassword('password123');
    }
    setIsLogin(true);
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 p-8 rounded-3xl shadow-2xl">
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-red-600/20 border border-red-500/40 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-red-950/40">
            <ShieldCheck className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-2xl font-black tracking-tight text-white">
            {isLogin ? 'RescueNet Access' : 'Create Emergency Account'}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Real-time emergency dispatch and incident resolution
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-950/70 border border-red-800 rounded-xl text-red-200 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {!isLogin && (
            <div>
              <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">Full Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane Doe"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-red-500"
              />
            </div>
          )}

          <div>
            <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@emergency.org"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-red-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-red-500"
            />
          </div>

          {!isLogin && (
            <>
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">Phone Number</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 (555) 000-0000"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">Account Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-red-500"
                >
                  <option value="USER">Citizen / Standard User</option>
                  <option value="RESPONDER">Certified Responder Unit</option>
                  <option value="ADMIN">System Administrator</option>
                </select>
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 bg-red-600 hover:bg-red-700 active:scale-[0.99] text-white font-bold py-3 rounded-xl transition text-sm flex items-center justify-center gap-2 shadow-lg shadow-red-950/40 disabled:opacity-50"
          >
            {loading ? 'Authenticating...' : isLogin ? 'Authenticate System' : 'Complete Registration'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="mt-4 pt-4 border-t border-slate-800 text-center">
          <button
            onClick={() => { setIsLogin(!isLogin); setError(''); }}
            className="text-xs text-slate-400 hover:text-white transition"
          >
            {isLogin ? "Need a new account? Register now" : 'Already registered? Sign In'}
          </button>
        </div>

        {/* Quick Demo Pre-fills */}
        <div className="mt-5 p-3.5 bg-slate-950/80 rounded-2xl border border-slate-800">
          <div className="text-[10px] uppercase font-bold text-slate-400 text-center mb-2.5 tracking-wider">
            Quick Fill Demo Credentials
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleDemoFill('CITIZEN')}
              className="py-1.5 px-2 text-[11px] font-bold bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-200 transition"
            >
              Citizen
            </button>
            <button
              type="button"
              onClick={() => handleDemoFill('RESPONDER')}
              className="py-1.5 px-2 text-[11px] font-bold bg-blue-900/40 hover:bg-blue-800/60 rounded-lg text-blue-300 transition"
            >
              Responder
            </button>
            <button
              type="button"
              onClick={() => handleDemoFill('ADMIN')}
              className="py-1.5 px-2 text-[11px] font-bold bg-emerald-900/40 hover:bg-emerald-800/60 rounded-lg text-emerald-300 transition"
            >
              Admin
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
