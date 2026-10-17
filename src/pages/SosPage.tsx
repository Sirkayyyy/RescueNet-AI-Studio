import React, { useState, useEffect, useRef } from 'react';
import API from '../services/api.js';
import { useSocket } from '../context/SocketContext.js';
import EmergencyMap from '../components/EmergencyMap.js';
import { useLocation } from '../context/LocationContext.js';
import { Incident, IncidentType } from '../types.js';
import {
  ShieldAlert,
  PhoneCall,
  Flame,
  HeartPulse,
  Car,
  AlertOctagon,
  CheckCircle2,
  Navigation,
  Bot,
  Radio,
  MapPin,
  Clock,
  Sparkles,
  Compass
} from 'lucide-react';

const CATEGORIES: { id: IncidentType; label: string; icon: any; color: string }[] = [
  { id: 'SECURITY', label: 'Security', icon: ShieldAlert, color: 'border-red-600 bg-red-950/40 text-red-400' },
  { id: 'MEDICAL', label: 'Medical', icon: HeartPulse, color: 'border-rose-600 bg-rose-950/40 text-rose-400' },
  { id: 'FIRE', label: 'Fire', icon: Flame, color: 'border-orange-600 bg-orange-950/40 text-orange-400' },
  { id: 'ACCIDENT', label: 'Accident', icon: Car, color: 'border-yellow-600 bg-yellow-950/40 text-yellow-400' },
  { id: 'OTHER', label: 'Other', icon: AlertOctagon, color: 'border-slate-600 bg-slate-900 text-slate-400' }
];

export default function SosPage() {
  const socket = useSocket();
  const { currentLocation, setIsLocationModalOpen } = useLocation();
  const [selectedType, setSelectedType] = useState<IncidentType>('SECURITY');
  const [description, setDescription] = useState('');
  const [activeIncident, setActiveIncident] = useState<Incident | null>(null);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [locationError, setLocationError] = useState('');

  // Live GPS state
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [isDemoGps, setIsDemoGps] = useState(false);

  const watchIdRef = useRef<number | null>(null);

  // Fetch active incident on mount
  useEffect(() => {
    const fetchActive = async () => {
      try {
        const { data } = await API.get('/incidents/active');
        if (data) {
          setActiveIncident(data);
          startLocationTracking(data._id);
        }
      } catch (err) {
        console.error('Failed to load active incident', err);
      }
    };
    fetchActive();

    return () => {
      stopLocationTracking();
    };
  }, []);

  // Socket listener for responder acceptance & status changes
  useEffect(() => {
    if (!socket || !activeIncident) return;

    socket.emit('join_incident', activeIncident._id);

    const handleStatusChanged = (updated: Incident) => {
      setActiveIncident(updated);
      if (updated.status === 'RESOLVED' || updated.status === 'CANCELLED') {
        stopLocationTracking();
      }
    };

    const handleResponderMoved = (data: { incidentId: string; responderLocation: { lat: number; lng: number; updatedAt: string } }) => {
      setActiveIncident((prev) =>
        prev
          ? {
              ...prev,
              responderLocation: data.responderLocation
            }
          : null
      );
    };

    socket.on('incident_status_changed', handleStatusChanged);
    socket.on('responder_moved', handleResponderMoved);

    return () => {
      socket.emit('leave_incident', activeIncident._id);
      socket.off('incident_status_changed', handleStatusChanged);
      socket.off('responder_moved', handleResponderMoved);
    };
  }, [socket, activeIncident?._id]);

  const startLocationTracking = (incidentId: string) => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser.');
      return;
    }

    stopLocationTracking();

    watchIdRef.current = navigator.geolocation.watchPosition(
      async (position) => {
        const { latitude, longitude, accuracy: acc } = position.coords;
        setGpsCoords({ lat: latitude, lng: longitude });
        setAccuracy(acc);
        setLocationError('');

        if (incidentId) {
          try {
            await API.patch(`/incidents/${incidentId}/location`, {
              lat: latitude,
              lng: longitude,
              accuracy: acc
            });
          } catch (err: any) {
            console.warn('Victim location sync failure', err.message);
          }
        }
      },
      (error) => {
        setLocationError(`GPS Notice: ${error.message}. You can use Demo GPS for indoor testing.`);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 12000
      }
    );
  };

  const stopLocationTracking = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  };

  const handleSimulateDemoGps = () => {
    setIsDemoGps(true);
    // Simulated coordinate in active location region (e.g. Lagos/Abuja or chosen location)
    const demo = {
      lat: currentLocation.lat + (Math.random() - 0.5) * 0.005,
      lng: currentLocation.lng + (Math.random() - 0.5) * 0.005
    };
    setGpsCoords(demo);
    setAccuracy(10);
    setLocationError('');
  };

  const handleTriggerSOS = async () => {
    setLoading(true);
    setStatusMessage('Acquiring high-precision GPS coordinates...');
    setLocationError('');

    const proceedWithCoords = async (coords: { lat: number; lng: number }, acc?: number) => {
      try {
        setStatusMessage('AI triaging emergency and dispatching nearby responders...');
        const { data } = await API.post('/incidents', {
          type: selectedType,
          description,
          lat: coords.lat,
          lng: coords.lng,
          accuracy: acc || 0
        });

        setActiveIncident(data);
        startLocationTracking(data._id);
        setStatusMessage('');
      } catch (err: any) {
        setStatusMessage('');
        alert(err.response?.data?.message || 'Failed to dispatch SOS signal.');
      } finally {
        setLoading(false);
      }
    };

    if (gpsCoords && isDemoGps) {
      await proceedWithCoords(gpsCoords, 10);
      return;
    }

    if (!navigator.geolocation) {
      setLoading(false);
      setLocationError('Geolocation API not supported. Using active region coordinate.');
      await proceedWithCoords({ lat: currentLocation.lat, lng: currentLocation.lng });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setGpsCoords(coords);
        setAccuracy(pos.coords.accuracy);
        await proceedWithCoords(coords, pos.coords.accuracy);
      },
      async (err) => {
        setLoading(false);
        setStatusMessage('');
        setLocationError(`GPS Permission notice (${err.message}). Using active location (${currentLocation.name}).`);
        const fallback = { lat: currentLocation.lat, lng: currentLocation.lng };
        setGpsCoords(fallback);
        await proceedWithCoords(fallback, 20);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const handleCancelSOS = async () => {
    if (!activeIncident) return;
    if (!window.confirm('Are you sure you want to cancel this emergency SOS?')) return;
    try {
      await API.patch(`/incidents/${activeIncident._id}/status`, { status: 'CANCELLED' });
      setActiveIncident(null);
      stopLocationTracking();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error cancelling incident');
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      {/* Active Incident Broadcast View */}
      {activeIncident ? (
        <div className="bg-slate-900 border-2 border-red-600/80 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-4">
            <div className="flex items-center gap-3">
              <span className="relative flex h-5 w-5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-5 w-5 bg-red-600"></span>
              </span>
              <div>
                <h2 className="text-xl font-black text-white uppercase tracking-wider flex items-center gap-2">
                  <span>ACTIVE SOS: {activeIncident.type}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-red-600 text-white font-black animate-pulse">
                    {activeIncident.status}
                  </span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  ID: <span className="font-mono text-slate-300">{activeIncident._id}</span> • Reported:{' '}
                  {new Date(activeIncident.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <a
                href={`tel:${currentLocation.emergencyNumber}`}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-black text-xs rounded-xl flex items-center gap-1.5 shadow-lg shadow-red-950/50 transition"
              >
                <PhoneCall className="w-4 h-4 animate-bounce" />
                Call {currentLocation.emergencyNumber} ({currentLocation.country})
              </a>
              <button
                onClick={handleCancelSOS}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl transition border border-slate-700"
              >
                Cancel SOS
              </button>
            </div>
          </div>

          {/* AI Guidance Box */}
          {activeIncident.aiGuidance && (
            <div className="bg-gradient-to-r from-purple-950/60 to-slate-900 border border-purple-800/80 rounded-2xl p-5 space-y-2 shadow-inner">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-purple-300 font-bold text-xs uppercase tracking-wide">
                  <Bot className="w-4 h-4 text-purple-400" />
                  <span>AI Triage Guidance</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-black bg-purple-900/80 text-purple-200 border border-purple-700">
                    {activeIncident.aiPriority} PRIORITY
                  </span>
                </div>
              </div>
              <p className="text-sm text-slate-100 font-medium leading-relaxed">{activeIncident.aiGuidance}</p>
              {activeIncident.aiSummary && (
                <p className="text-xs text-slate-400 italic">Assessment: {activeIncident.aiSummary}</p>
              )}
            </div>
          )}

          {/* Responder Live Status Card */}
          <div className="bg-slate-950 rounded-2xl p-4 border border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="text-[11px] uppercase font-bold text-slate-400">Assigned Dispatch Unit</div>
              {activeIncident.responder ? (
                <div className="text-slate-100 font-bold text-sm mt-0.5 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse"></span>
                  <span>{activeIncident.responder.name}</span>
                  {activeIncident.responder.phone && (
                    <a
                      href={`tel:${activeIncident.responder.phone}`}
                      className="text-xs text-blue-400 hover:underline flex items-center gap-1 font-mono"
                    >
                      <PhoneCall className="w-3 h-3" /> {activeIncident.responder.phone}
                    </a>
                  )}
                </div>
              ) : (
                <div className="text-amber-400 font-semibold text-sm animate-pulse mt-0.5 flex items-center gap-2">
                  <Radio className="w-4 h-4" />
                  Broadcasting to nearest certified emergency responders...
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Mission State:</span>
              <span className="px-3 py-1 text-xs font-black rounded-lg bg-slate-800 border border-slate-700 text-slate-200 uppercase tracking-wide">
                {activeIncident.status}
              </span>
            </div>
          </div>

          {/* Live Map Display */}
          <EmergencyMap
            victimLocation={activeIncident.location}
            responderLocation={activeIncident.responderLocation}
            height="380px"
          />

          <div className="text-[11px] text-slate-500 text-center flex items-center justify-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Real-time GPS coordinate telemetry active. Tracking terminates upon resolution.
          </div>
        </div>
      ) : (
        /* Create New SOS Incident Screen */
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl text-center space-y-6">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-950/60 border border-red-800/60 text-red-400 text-xs font-bold uppercase tracking-wider mb-2">
              <Radio className="w-3.5 h-3.5 animate-pulse" />
              Emergency Response Dispatch Core
            </div>
            <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              EMERGENCY SOS DISPATCH
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-lg mx-auto">
              Select category, describe briefly if able, and trigger the SOS. Coordinates and AI triage are instantly routed to first responders.
            </p>
          </div>

          {/* Active Location Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-slate-950 p-3.5 rounded-2xl border border-slate-800 text-xs gap-2.5 max-w-2xl mx-auto shadow-inner">
            <div className="flex items-center gap-2.5 text-left">
              <div className="p-2 bg-red-600/20 border border-red-500/30 rounded-xl text-red-400">
                <MapPin className="w-4 h-4 flex-shrink-0" />
              </div>
              <div>
                <span className="text-slate-400 font-semibold block text-[11px]">Active Dispatch Location:</span>
                <strong className="text-white text-xs">{currentLocation.name}</strong>
                <span className="ml-2 px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 font-black text-[10px] border border-emerald-800">
                  {currentLocation.countryName} ({currentLocation.emergencyNumber})
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsLocationModalOpen(true)}
              className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-blue-300 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer self-start sm:self-auto border border-slate-700"
            >
              <Compass className="w-3.5 h-3.5" />
              Change Location
            </button>
          </div>

          {/* Category Selector */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 max-w-2xl mx-auto">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const isSelected = selectedType === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedType(cat.id)}
                  className={`p-3.5 rounded-2xl border flex flex-col items-center gap-2 transition cursor-pointer ${
                    isSelected
                      ? `${cat.color} border-2 shadow-lg scale-105`
                      : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <Icon className="w-6 h-6" />
                  <span className="text-xs font-bold">{cat.label}</span>
                </button>
              );
            })}
          </div>

          {/* Emergency Description */}
          <div className="max-w-xl mx-auto text-left">
            <label className="block text-xs font-bold uppercase text-slate-400 mb-1.5">
              Short Description / Immediate Danger (Optional)
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Heavy smoke on 2nd floor, stairwell blocked, or severe chest pain..."
              className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-red-500"
            />
          </div>

          {/* Giant SOS Button */}
          <div className="py-4 flex flex-col items-center justify-center">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-red-600/30 blur-2xl animate-pulse"></div>
              <button
                type="button"
                onClick={handleTriggerSOS}
                disabled={loading}
                className="relative w-48 h-48 sm:w-56 sm:h-56 rounded-full bg-gradient-to-br from-red-500 via-red-600 to-red-800 hover:from-red-600 hover:to-red-900 active:scale-95 shadow-[0_0_80px_rgba(239,68,68,0.6)] border-4 border-red-300/40 flex flex-col items-center justify-center text-white transition-all transform cursor-pointer disabled:opacity-50"
              >
                <ShieldAlert className="w-16 h-16 sm:w-20 sm:h-20 animate-bounce" />
                <span className="text-3xl sm:text-4xl font-black tracking-widest mt-1">SOS</span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-red-200 mt-0.5">
                  {loading ? 'DISPATCHING...' : 'PRESS TO ALERT'}
                </span>
              </button>
            </div>

            {statusMessage && (
              <p className="mt-5 text-xs font-bold text-red-400 animate-pulse flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" />
                {statusMessage}
              </p>
            )}
            {locationError && (
              <p className="mt-4 text-xs text-amber-300 max-w-md bg-amber-950/40 p-2.5 rounded-xl border border-amber-800/80">
                {locationError}
              </p>
            )}
          </div>

          {/* Quick Direct Calling & Demo Mode */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-4 border-t border-slate-800">
            <a
              href={`tel:${currentLocation.emergencyNumber}`}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition border border-slate-700 shadow"
            >
              <PhoneCall className="w-4 h-4 text-red-400" />
              Emergency Services: {currentLocation.emergencyNumber} ({currentLocation.countryName})
            </a>

            <button
              type="button"
              onClick={handleSimulateDemoGps}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition border border-dashed ${
                isDemoGps
                  ? 'bg-blue-950/60 text-blue-300 border-blue-600'
                  : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 border-slate-700'
              }`}
            >
              <Navigation className="w-3.5 h-3.5 text-blue-400" />
              {isDemoGps ? `Demo GPS Active (${currentLocation.name.split(' (')[0]})` : 'Enable Demo GPS (Local Testing)'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
