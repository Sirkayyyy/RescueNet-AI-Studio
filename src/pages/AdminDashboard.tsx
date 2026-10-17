import React, { useState, useEffect } from 'react';
import API from '../services/api.js';
import {
  Users,
  ShieldAlert,
  AlertTriangle,
  PhoneCall,
  CheckCircle,
  Trash2,
  Plus,
  RefreshCw,
  Building2
} from 'lucide-react';
import { AdminStats, Alert, EmergencyNumber, Incident } from '../types.js';

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [recentIncidents, setRecentIncidents] = useState<Incident[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [emergencyNumbers, setEmergencyNumbers] = useState<EmergencyNumber[]>([]);
  const [loading, setLoading] = useState(false);

  // New emergency number form state
  const [numName, setNumName] = useState('');
  const [numDigits, setNumDigits] = useState('');
  const [numCategory, setNumCategory] = useState<'POLICE' | 'AMBULANCE' | 'FIRE' | 'GENERAL'>('POLICE');
  const [region, setRegion] = useState('National');

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [statsRes, alertsRes, numsRes] = await Promise.all([
        API.get('/admin/stats'),
        API.get('/alerts'),
        API.get('/admin/numbers')
      ]);

      setStats(statsRes.data.stats);
      setRecentIncidents(statsRes.data.recentIncidents || []);
      setAlerts(alertsRes.data || []);
      setEmergencyNumbers(numsRes.data || []);
    } catch (err) {
      console.error('Admin data load failure', err);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAlert = async (id: string, status: 'VERIFIED' | 'RESOLVED') => {
    try {
      await API.patch(`/alerts/${id}/status`, { status });
      loadAll();
    } catch {
      alert('Error updating alert verification status');
    }
  };

  const handleAddNumber = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!numName || !numDigits) return;
    try {
      await API.post('/admin/numbers', {
        name: numName,
        number: numDigits,
        category: numCategory,
        region: region || 'National'
      });
      setNumName('');
      setNumDigits('');
      loadAll();
    } catch {
      alert('Failed to register emergency number');
    }
  };

  const handleDeleteNumber = async (id: string) => {
    try {
      await API.delete(`/admin/numbers/${id}`);
      loadAll();
    } catch {
      alert('Error removing entry');
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white">Central Operations & Administration</h1>
          <p className="text-xs text-slate-400">
            Global system health, emergency agency numbers database, and danger alert validation.
          </p>
        </div>

        <button
          onClick={loadAll}
          disabled={loading}
          className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
          Refresh Stats
        </button>
      </div>

      {/* KPI Stats Grid */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl">
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Active Emergencies</span>
            <div className="text-3xl font-black text-red-500 mt-1">{stats.activeIncidents}</div>
            <span className="text-[10px] text-slate-500">Real-time unassigned / claimed</span>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl">
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Total Incidents</span>
            <div className="text-3xl font-black text-white mt-1">{stats.totalIncidents}</div>
            <span className="text-[10px] text-slate-500">Historical logs</span>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl">
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Active Responders</span>
            <div className="text-3xl font-black text-blue-400 mt-1">{stats.activeResponders}</div>
            <span className="text-[10px] text-slate-500">Available on duty</span>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl">
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Registered Citizens</span>
            <div className="text-3xl font-black text-emerald-400 mt-1">{stats.totalUsers}</div>
            <span className="text-[10px] text-slate-500">Protected accounts</span>
          </div>
        </div>
      )}

      {/* Danger Alerts Verification Center */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <h2 className="text-base font-black text-white flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            Alert Verification & Moderation Queue
          </h2>
          <span className="text-xs text-slate-400 font-mono">{alerts.length} total alerts</span>
        </div>

        <div className="space-y-3">
          {alerts.length === 0 ? (
            <p className="text-xs text-slate-500 italic py-2">No danger alerts in registry.</p>
          ) : (
            alerts.map((alert) => (
              <div
                key={alert._id}
                className="p-4 bg-slate-950 border border-slate-800/80 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition hover:border-slate-700"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white">{alert.title}</span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-black uppercase ${
                        alert.status === 'VERIFIED'
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          : alert.status === 'REPORTED'
                          ? 'bg-amber-950 text-amber-300 border border-amber-800'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {alert.status}
                    </span>
                    <span className="text-[10px] text-slate-500">[{alert.severity} — {alert.type}]</span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">{alert.description}</p>
                  <p className="text-[10px] text-slate-500 mt-1">Area: {alert.location?.address}</p>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {alert.status === 'REPORTED' && (
                    <>
                      <button
                        onClick={() => handleVerifyAlert(alert._id, 'VERIFIED')}
                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition cursor-pointer shadow"
                      >
                        Verify & Broadcast
                      </button>
                      <button
                        onClick={() => handleVerifyAlert(alert._id, 'RESOLVED')}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition cursor-pointer"
                      >
                        Dismiss
                      </button>
                    </>
                  )}
                  {alert.status === 'VERIFIED' && (
                    <button
                      onClick={() => handleVerifyAlert(alert._id, 'RESOLVED')}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-xl text-xs font-semibold transition cursor-pointer"
                    >
                      Mark Resolved
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Emergency Calling Directory Management */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-800">
          <div>
            <h2 className="text-base font-black text-white flex items-center gap-2">
              <PhoneCall className="w-5 h-5 text-red-500" />
              Configured Emergency Lines Directory
            </h2>
            <p className="text-xs text-slate-400">
              Emergency dispatch numbers mapped across Nigeria, United States, and international zones.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {emergencyNumbers.map((num) => (
            <div
              key={num._id}
              className={`p-3.5 bg-slate-950 border rounded-2xl flex justify-between items-center transition hover:border-slate-700 ${
                num.region.includes('Nigeria') ? 'border-emerald-900/60 shadow-sm' : 'border-slate-800'
              }`}
            >
              <div>
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span>{num.name}</span>
                  {num.region.includes('Nigeria') && (
                    <span className="text-[9px] bg-emerald-950 text-emerald-400 border border-emerald-800 px-1 py-0.2 rounded font-black">
                      NG
                    </span>
                  )}
                </div>
                <div className="text-sm font-mono font-black text-red-400">{num.number}</div>
                <div className="text-[10px] text-slate-500 uppercase">{num.category} • {num.region}</div>
              </div>
              <button
                onClick={() => handleDeleteNumber(num._id)}
                className="p-2 text-slate-500 hover:text-red-400 rounded-xl hover:bg-slate-800 transition"
                title="Remove Entry"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        {/* Add Number Form */}
        <form onSubmit={handleAddNumber} className="pt-4 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-5 gap-2.5">
          <input
            type="text"
            required
            placeholder="Agency Name (e.g. LASEMA)"
            value={numName}
            onChange={(e) => setNumName(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-red-500"
          />
          <input
            type="text"
            required
            placeholder="Dial Number (e.g. 112)"
            value={numDigits}
            onChange={(e) => setNumDigits(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-red-500 font-mono"
          />
          <input
            type="text"
            placeholder="Region (e.g. Nigeria, Lagos)"
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-red-500"
          />
          <select
            value={numCategory}
            onChange={(e) => setNumCategory(e.target.value as any)}
            className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none"
          >
            <option value="POLICE">Police</option>
            <option value="AMBULANCE">Ambulance</option>
            <option value="FIRE">Fire</option>
            <option value="DISASTER">Disaster Response</option>
            <option value="GENERAL">General Agency</option>
          </select>
          <button
            type="submit"
            className="bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer shadow-md"
          >
            <Plus className="w-4 h-4" /> Add Emergency Line
          </button>
        </form>
      </div>
    </div>
  );
}
