import React, { useState, useEffect, useRef } from 'react';
import API from '../services/api.js';
import { useSocket } from '../context/SocketContext.js';
import { useAuth } from '../context/AuthContext.js';
import { useLocation } from '../context/LocationContext.js';
import EmergencyMap from '../components/EmergencyMap.js';
import { Incident } from '../types.js';
import {
  Radio,
  CheckCircle,
  Clock,
  MapPin,
  Phone,
  AlertOctagon,
  ArrowRight,
  ShieldCheck,
  Navigation,
  Bot,
  Compass
} from 'lucide-react';

export default function ResponderDashboard() {
  const socket = useSocket();
  const { user } = useAuth();
  const { currentLocation, setIsLocationModalOpen } = useLocation();
  const [isAvailable, setIsAvailable] = useState<boolean>(user?.isAvailable ?? true);
  const [activeIncident, setActiveIncident] = useState<Incident | null>(null);
  const [pendingIncidents, setPendingIncidents] = useState<Incident[]>([]);
  const [responderCoords, setResponderCoords] = useState<{ lat: number; lng: number } | null>(null);

  const watchIdRef = useRef<number | null>(null);

  useEffect(() => {
    loadActive();
    loadPending();
  }, []);

  // Sync responder real-time location via watchPosition
  useEffect(() => {
    if (!navigator.geolocation) return;

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setResponderCoords(coords);

        if (socket && user) {
          socket.emit('responder_location_update', {
            incidentId: activeIncident?._id || undefined,
            responderId: user._id,
            lat: coords.lat,
            lng: coords.lng
          });
        }
      },
      (err) => console.log('Responder GPS Warning:', err.message),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
    );

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [socket, activeIncident?._id, user?._id]);

  useEffect(() => {
    if (!socket) return;

    const handleNewBroadcast = (incident: Incident) => {
      setPendingIncidents((prev) => [incident, ...prev]);
    };

    const handleClaimed = ({ incidentId }: { incidentId: string }) => {
      setPendingIncidents((prev) => prev.filter((inc) => inc._id !== incidentId));
    };

    const handleVictimLoc = (data: { incidentId: string; location: { lat: number; lng: number; accuracy: number } }) => {
      if (activeIncident && activeIncident._id === data.incidentId) {
        setActiveIncident((prev) => (prev ? { ...prev, location: data.location } : null));
      }
    };

    socket.on('new_incident_broadcast', handleNewBroadcast);
    socket.on('incident_claimed', handleClaimed);
    socket.on('victim_location_update', handleVictimLoc);

    return () => {
      socket.off('new_incident_broadcast', handleNewBroadcast);
      socket.off('incident_claimed', handleClaimed);
      socket.off('victim_location_update', handleVictimLoc);
    };
  }, [socket, activeIncident]);

  const loadActive = async () => {
    try {
      const { data } = await API.get('/incidents/active');
      setActiveIncident(data);
      if (data && socket) {
        socket.emit('join_incident', data._id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadPending = async () => {
    try {
      const { data } = await API.get('/incidents/pending');
      setPendingIncidents(data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const toggleAvailability = async () => {
    try {
      const { data } = await API.patch('/auth/responder/toggle-availability');
      setIsAvailable(data.isAvailable);
    } catch {
      alert('Could not update status');
    }
  };

  const handleAcceptIncident = async (id: string) => {
    try {
      const { data } = await API.patch(`/incidents/${id}/accept`);
      setActiveIncident(data);
      setPendingIncidents((prev) => prev.filter((i) => i._id !== id));
      if (socket) socket.emit('join_incident', data._id);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error accepting incident');
    }
  };

  const handleUpdateStatus = async (newStatus: string) => {
    if (!activeIncident) return;
    try {
      const { data } = await API.patch(`/incidents/${activeIncident._id}/status`, {
        status: newStatus
      });
      if (newStatus === 'RESOLVED' || newStatus === 'CANCELLED') {
        setActiveIncident(null);
        loadPending();
      } else {
        setActiveIncident(data);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error updating status');
    }
  };

  // Demo Movement Simulator for Responder (simulates approaching victim on the map)
  const handleSimulateMovement = () => {
    if (!activeIncident?.location) return;

    setResponderCoords((prev) => {
      const currentLat = prev?.lat || activeIncident.location.lat + 0.012;
      const currentLng = prev?.lng || activeIncident.location.lng + 0.012;
      const newLat = currentLat + (activeIncident.location.lat - currentLat) * 0.3;
      const newLng = currentLng + (activeIncident.location.lng - currentLng) * 0.3;

      if (socket && user) {
        socket.emit('responder_location_update', {
          incidentId: activeIncident._id,
          responderId: user._id,
          lat: newLat,
          lng: newLng
        });
      }
      return { lat: newLat, lng: newLng };
    });
  };

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">
      {/* Command Status Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-xl">
        <div>
          <h1 className="text-xl font-black text-white flex items-center gap-2">
            <Radio className="w-5 h-5 text-blue-500 animate-pulse" />
            Responder Command Console
          </h1>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <p className="text-xs text-slate-400">
              Officer: <span className="text-white font-bold">{user?.name}</span>
            </p>
            <span className="text-slate-600">•</span>
            <button
              onClick={() => setIsLocationModalOpen(true)}
              className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1 hover:underline cursor-pointer"
            >
              <MapPin className="w-3 h-3 text-red-400" />
              <span>Sector: {currentLocation.name.split(' (')[0]} ({currentLocation.countryName})</span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={toggleAvailability}
            className={`px-4 py-2.5 rounded-xl text-xs font-black transition flex items-center gap-2 cursor-pointer shadow-lg ${
              isAvailable
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-950/40'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-400'
            }`}
          >
            <span className={`w-2.5 h-2.5 rounded-full ${isAvailable ? 'bg-white' : 'bg-slate-500'}`} />
            {isAvailable ? 'Available for Dispatch' : 'Standby / Offline'}
          </button>
        </div>
      </div>

      {/* Active Incident Console */}
      {activeIncident ? (
        <div className="bg-slate-900 border-2 border-blue-600 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-4 border-b border-slate-800 gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800">
                  MISSION ACTIVE
                </span>
                <span className="text-xs text-slate-400 font-mono">ID: {activeIncident._id}</span>
              </div>
              <h2 className="text-2xl font-black text-white mt-1">
                {activeIncident.type} EMERGENCY
              </h2>
              <p className="text-xs text-slate-400">
                Citizen / Victim: <span className="text-white font-bold">{activeIncident.victim?.name || 'Citizen'}</span>
              </p>
            </div>

            {/* Status Pipeline Controls */}
            <div className="flex flex-wrap items-center gap-2">
              {activeIncident.status === 'ACCEPTED' && (
                <button
                  onClick={() => handleUpdateStatus('EN_ROUTE')}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-lg shadow-blue-950/50 cursor-pointer"
                >
                  Confirm: En Route <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}

              {activeIncident.status === 'EN_ROUTE' && (
                <button
                  onClick={() => handleUpdateStatus('ARRIVED')}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-lg shadow-amber-950/50 cursor-pointer"
                >
                  Confirm: Arrived On Scene
                </button>
              )}

              {activeIncident.status === 'ARRIVED' && (
                <button
                  onClick={() => handleUpdateStatus('RESOLVED')}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-lg shadow-emerald-950/50 cursor-pointer"
                >
                  <CheckCircle className="w-3.5 h-3.5" /> Mark Incident Resolved
                </button>
              )}

              <button
                onClick={handleSimulateMovement}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-blue-300 text-xs font-semibold rounded-xl flex items-center gap-1.5 border border-blue-900/60 transition cursor-pointer"
                title="Simulate GPS movement toward victim for indoor testing"
              >
                <Navigation className="w-3.5 h-3.5" /> Step Closer (Demo Movement)
              </button>
            </div>
          </div>

          {/* Details & Victim Contact */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800">
              <span className="text-[11px] font-bold uppercase text-slate-400">Victim Contact</span>
              <div className="mt-1.5 flex items-center justify-between">
                <div>
                  <span className="text-sm font-bold text-white block">
                    {activeIncident.victim?.name || 'Citizen'}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    {activeIncident.victim?.phone || 'No direct phone'}
                  </span>
                </div>
                {activeIncident.victim?.phone && (
                  <a
                    href={`tel:${activeIncident.victim.phone}`}
                    className="p-2.5 bg-red-600/30 text-red-300 rounded-xl hover:bg-red-600/50 transition"
                    title="Call Citizen"
                  >
                    <Phone className="w-4 h-4" />
                  </a>
                )}
              </div>
            </div>

            <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 md:col-span-2">
              <span className="text-[11px] font-bold uppercase text-purple-400 flex items-center gap-1.5">
                <Bot className="w-3.5 h-3.5" />
                AI Triage Assessment ({activeIncident.aiPriority} Priority)
              </span>
              <p className="mt-1 text-xs text-slate-200 leading-relaxed font-medium">
                {activeIncident.aiGuidance || activeIncident.description || 'Emergency assistance dispatched.'}
              </p>
              {activeIncident.aiSummary && (
                <p className="text-[11px] text-slate-400 mt-1 italic">
                  Summary: {activeIncident.aiSummary}
                </p>
              )}
            </div>
          </div>

          {/* Active Navigation Map */}
          <EmergencyMap
            victimLocation={activeIncident.location}
            responderLocation={responderCoords || activeIncident.responderLocation}
            height="460px"
          />
        </div>
      ) : (
        /* Open Incidents Queue */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              <AlertOctagon className="w-5 h-5 text-red-500" />
              Pending Emergency Dispatch Queue ({pendingIncidents.length})
            </h2>
            <button
              onClick={loadPending}
              className="text-xs text-blue-400 hover:underline font-semibold"
            >
              Refresh Queue
            </button>
          </div>

          <div className="grid gap-3">
            {pendingIncidents.length === 0 ? (
              <div className="p-10 text-center bg-slate-900 border border-slate-800 rounded-3xl text-slate-400 text-sm">
                No unassigned emergencies currently pending in your sector. All active signals resolved.
              </div>
            ) : (
              pendingIncidents.map((incident) => (
                <div
                  key={incident._id}
                  className="p-5 bg-slate-900 border border-slate-800 hover:border-red-600/50 rounded-2xl transition flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-lg"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase bg-red-600 text-white">
                        {incident.type}
                      </span>
                      <span className="text-xs font-bold text-slate-300">
                        Priority: <span className="text-red-400 font-black">{incident.aiPriority || 'HIGH'}</span>
                      </span>
                      <span className="text-[11px] text-slate-500 font-mono">
                        {new Date(incident.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="text-sm font-bold text-white">
                      {incident.description || `${incident.type} Emergency Beacon Signal`}
                    </div>
                    <div className="text-xs text-slate-400 flex items-center gap-2">
                      <span>Victim: <strong className="text-slate-200">{incident.victim?.name || 'Citizen'}</strong></span>
                      {incident.victim?.phone && (
                        <span className="font-mono text-slate-400">({incident.victim.phone})</span>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => handleAcceptIncident(incident._id)}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-950/40 transition flex items-center gap-1.5 self-end sm:self-auto cursor-pointer"
                  >
                    Accept & Dispatch
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
