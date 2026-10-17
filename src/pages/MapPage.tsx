import React, { useState, useEffect } from 'react';
import API from '../services/api.js';
import EmergencyMap from '../components/EmergencyMap.js';
import { useLocation } from '../context/LocationContext.js';
import { Layers, ShieldAlert, Navigation, RefreshCw, AlertTriangle, MapPin, Compass } from 'lucide-react';
import { Alert, Incident } from '../types.js';

export default function MapPage() {
  const { currentLocation, setIsLocationModalOpen } = useLocation();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [activeIncident, setActiveIncident] = useState<Incident | null>(null);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>({
    lat: currentLocation.lat,
    lng: currentLocation.lng
  });
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [alertsRes, incidentRes] = await Promise.all([
        API.get('/alerts'),
        API.get('/incidents/active').catch(() => ({ data: null }))
      ]);
      setAlerts(alertsRes.data || []);
      setActiveIncident(incidentRes.data || null);
    } catch (err) {
      console.error('Map data load error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => setUserCoords({ lat: currentLocation.lat, lng: currentLocation.lng })
      );
    } else {
      setUserCoords({ lat: currentLocation.lat, lng: currentLocation.lng });
    }

    loadData();
  }, [currentLocation]);

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-xl">
        <div>
          <h1 className="text-xl font-black text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-blue-400" />
            Live Tactical & Hazard Map
          </h1>
          <p className="text-xs text-slate-400">
            Real-time geospatial intelligence, verified danger perimeters, and active dispatch markers.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Active location chip */}
          <button
            onClick={() => setIsLocationModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-300 transition cursor-pointer"
            title="Change active map location"
          >
            <MapPin className="w-3.5 h-3.5 text-red-500" />
            <span className="text-white font-bold">{currentLocation.name.split(' (')[0]}</span>
            <span className="text-[10px] text-emerald-400 font-mono">({currentLocation.country})</span>
            <Compass className="w-3 h-3 text-slate-500 ml-1" />
          </button>

          <div className="flex items-center gap-3 text-xs bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
            <div className="flex items-center gap-1.5 text-red-400 font-bold">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span> Incident
            </div>
            <div className="flex items-center gap-1.5 text-blue-400 font-bold">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span> Responder
            </div>
            <div className="flex items-center gap-1.5 text-amber-400 font-bold">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Hazard
            </div>
          </div>

          <button
            onClick={loadData}
            disabled={loading}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition cursor-pointer"
            title="Refresh Map Grid"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-400' : ''}`} />
          </button>
        </div>
      </div>

      <EmergencyMap
        victimLocation={activeIncident ? activeIncident.location : userCoords}
        responderLocation={activeIncident ? activeIncident.responderLocation : null}
        alerts={alerts}
        height="620px"
      />
    </div>
  );
}
