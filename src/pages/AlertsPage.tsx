import React, { useState, useEffect } from 'react';
import API from '../services/api.js';
import { useSocket } from '../context/SocketContext.js';
import { useLocation } from '../context/LocationContext.js';
import { Alert, AlertType, AlertSeverity } from '../types.js';
import { AlertTriangle, Plus, CheckCircle, ShieldAlert, Clock, MapPin, Filter } from 'lucide-react';

export default function AlertsPage() {
  const socket = useSocket();
  const { currentLocation } = useLocation();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [filterSeverity, setFilterSeverity] = useState<string>('ALL');

  // Form states
  const [title, setTitle] = useState('');
  const [type, setType] = useState<AlertType>('HAZARD');
  const [severity, setSeverity] = useState<AlertSeverity>('MODERATE');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [radiusMeters, setRadiusMeters] = useState(1500);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchAlerts();
  }, []);

  useEffect(() => {
    if (!socket) return;

    const handleNewAlert = (newAlert: Alert) => {
      setAlerts((prev) => [newAlert, ...prev]);
    };

    const handleStatusUpdated = (updated: Alert) => {
      setAlerts((prev) => prev.map((a) => (a._id === updated._id ? updated : a)));
    };

    socket.on('new_danger_alert', handleNewAlert);
    socket.on('alert_status_updated', handleStatusUpdated);

    return () => {
      socket.off('new_danger_alert', handleNewAlert);
      socket.off('alert_status_updated', handleStatusUpdated);
    };
  }, [socket]);

  const fetchAlerts = async () => {
    try {
      const { data } = await API.get('/alerts');
      setAlerts(data);
    } catch (err) {
      console.error('Failed to fetch danger alerts', err);
    }
  };

  const handleCreateAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    let lat = currentLocation.lat;
    let lng = currentLocation.lng;

    if (navigator.geolocation) {
      try {
        const pos = await new Promise<GeolocationPosition>((res, rej) =>
          navigator.geolocation.getCurrentPosition(res, rej, { timeout: 3500 })
        );
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
      } catch {
        // Fallback to active chosen location
      }
    }

    try {
      await API.post('/alerts', {
        title,
        type,
        severity,
        description,
        address: address || 'Reported Location',
        lat,
        lng,
        radiusMeters
      });
      setShowModal(false);
      setTitle('');
      setDescription('');
      setAddress('');
      fetchAlerts();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error posting alert');
    } finally {
      setLoading(false);
    }
  };

  const filteredAlerts = alerts.filter((a) => {
    if (filterSeverity === 'ALL') return true;
    return a.severity === filterSeverity;
  });

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-amber-500" />
            Public Danger & Hazard Alerts
          </h1>
          <p className="text-xs text-slate-400">
            Real-time verified hazard warnings and public safety broadcasts.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition self-start sm:self-auto shadow-lg shadow-amber-950/40 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Report Danger Hazard
        </button>
      </div>

      {/* Severity Filter Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        <span className="text-slate-500 font-bold flex items-center gap-1 text-[11px] uppercase">
          <Filter className="w-3 h-3" /> Filter:
        </span>
        {['ALL', 'EXTREME', 'SEVERE', 'MODERATE', 'LOW'].map((sev) => (
          <button
            key={sev}
            onClick={() => setFilterSeverity(sev)}
            className={`px-3 py-1 rounded-lg font-bold transition text-xs ${
              filterSeverity === sev
                ? 'bg-slate-700 text-white shadow'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            {sev}
          </button>
        ))}
      </div>

      {/* Alerts Grid */}
      <div className="grid gap-4">
        {filteredAlerts.length === 0 ? (
          <div className="p-10 text-center bg-slate-900 border border-slate-800 rounded-2xl text-slate-400 text-sm">
            No danger alerts matching criteria in this sector.
          </div>
        ) : (
          filteredAlerts.map((alert) => (
            <div
              key={alert._id}
              className={`p-5 rounded-2xl border bg-slate-900 shadow-xl transition hover:border-slate-700 ${
                alert.severity === 'EXTREME' || alert.severity === 'SEVERE'
                  ? 'border-red-600/60 shadow-red-950/20'
                  : 'border-slate-800'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2.5 border-b border-slate-800/80 gap-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2.5 py-0.5 text-[10px] font-black rounded-lg uppercase tracking-wide ${
                      alert.severity === 'EXTREME'
                        ? 'bg-red-600 text-white'
                        : alert.severity === 'SEVERE'
                        ? 'bg-orange-600 text-white'
                        : 'bg-amber-600 text-white'
                    }`}
                  >
                    {alert.severity}
                  </span>
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wide">
                    {alert.type}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                      alert.status === 'VERIFIED'
                        ? 'bg-emerald-950 border border-emerald-700 text-emerald-300'
                        : 'bg-yellow-950 border border-yellow-700 text-yellow-300'
                    }`}
                  >
                    {alert.status}
                  </span>
                  <span className="text-[11px] text-slate-500 flex items-center gap-1 font-mono">
                    <Clock className="w-3 h-3" />
                    {new Date(alert.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>

              <h3 className="text-base font-bold text-white mt-3">{alert.title}</h3>
              <p className="text-xs sm:text-sm text-slate-300 mt-1 leading-relaxed">{alert.description}</p>

              <div className="mt-3.5 pt-2.5 border-t border-slate-800/60 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-red-400" />
                  <span>{alert.location?.address || 'Zone Boundary'}</span>
                  <span className="text-[10px] text-slate-600 font-mono">
                    ({alert.location?.lat.toFixed(4)}, {alert.location?.lng.toFixed(4)})
                  </span>
                </div>
                {alert.location?.radiusMeters && (
                  <span className="text-[10px] text-slate-500 font-mono">
                    Hazard Radius: ~{alert.location.radiusMeters}m
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Report Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-amber-500" />
              Report Danger Hazard
            </h2>
            <p className="text-xs text-slate-400">
              Submit public hazard observations for immediate admin verification and grid broadcast.
            </p>

            <form onSubmit={handleCreateAlert} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Hazard Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Major Chemical Spill / Fallen High-Voltage Line"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Hazard Type</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as AlertType)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none"
                  >
                    <option value="HAZARD">General Hazard</option>
                    <option value="FIRE">Fire</option>
                    <option value="SECURITY">Security</option>
                    <option value="WEATHER">Weather</option>
                    <option value="ACCIDENT">Accident</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Severity</label>
                  <select
                    value={severity}
                    onChange={(e) => setSeverity(e.target.value as AlertSeverity)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none"
                  >
                    <option value="LOW">Low</option>
                    <option value="MODERATE">Moderate</option>
                    <option value="SEVERE">Severe</option>
                    <option value="EXTREME">Extreme</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Landmark / Sector Address</label>
                <input
                  type="text"
                  placeholder="e.g. 5th Avenue & Grand Crossing"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Detailed Description</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Describe hazard specifics, road blockages, gas smells, or immediate safety precautions..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition disabled:opacity-50 shadow-md"
                >
                  {loading ? 'Submitting...' : 'Transmit Alert'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
