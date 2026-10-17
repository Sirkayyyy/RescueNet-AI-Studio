import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { Alert } from '../types.js';
import { useLocation } from '../context/LocationContext.js';

// Calculate distance between two lat/lng points in km
function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number): string {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return (R * c).toFixed(2);
}

// Marker icon generator using SVG data URIs
const createColoredIcon = (colorHex: string, label?: string) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="36" height="36" fill="${colorHex}">
    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
  </svg>`;
  return L.divIcon({
    className: 'custom-leaflet-icon',
    html: `<div class="relative flex flex-col items-center">
      ${svg}
      ${label ? `<span class="bg-slate-900/90 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow border border-slate-700 whitespace-nowrap mt-0.5">${label}</span>` : ''}
    </div>`,
    iconSize: [36, 48],
    iconAnchor: [18, 36],
    popupAnchor: [0, -36]
  });
};

const victimIcon = createColoredIcon('#ef4444', 'Victim');
const responderIcon = createColoredIcon('#3b82f6', 'Responder');
const alertIcon = createColoredIcon('#f59e0b', 'Hazard');

interface EmergencyMapProps {
  victimLocation?: { lat: number; lng: number } | null;
  responderLocation?: { lat: number | null; lng: number | null } | null;
  alerts?: Alert[];
  interactive?: boolean;
  height?: string;
  onLocationSelect?: (coords: { lat: number; lng: number }) => void;
}

export default function EmergencyMap({
  victimLocation,
  responderLocation,
  alerts = [],
  interactive = true,
  height = '420px',
  onLocationSelect
}: EmergencyMapProps) {
  const { currentLocation } = useLocation();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<{ [key: string]: L.Marker }>({});
  const polylineRef = useRef<L.Polyline | null>(null);

  const defaultCenter: [number, number] = [currentLocation.lat, currentLocation.lng];

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const initialLat = victimLocation?.lat || responderLocation?.lat || defaultCenter[0];
      const initialLng = victimLocation?.lng || responderLocation?.lng || defaultCenter[1];

      const map = L.map(mapContainerRef.current, {
        center: [initialLat, initialLng],
        zoom: 14,
        zoomControl: interactive,
        dragging: interactive,
        scrollWheelZoom: interactive
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      }).addTo(map);

      if (onLocationSelect) {
        map.on('click', (e: L.LeafletMouseEvent) => {
          onLocationSelect({ lat: e.latlng.lat, lng: e.latlng.lng });
        });
      }

      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;
    if (!map) return;

    // Render / update victim location
    if (victimLocation?.lat && victimLocation?.lng) {
      if (markersRef.current.victim) {
        markersRef.current.victim.setLatLng([victimLocation.lat, victimLocation.lng]);
      } else {
        markersRef.current.victim = L.marker([victimLocation.lat, victimLocation.lng], { icon: victimIcon })
          .addTo(map)
          .bindPopup('<b>Emergency Location (Victim)</b><br>Live GPS tracking enabled.');
      }
    } else if (markersRef.current.victim) {
      markersRef.current.victim.remove();
      delete markersRef.current.victim;
    }

    // Render / update responder location
    if (responderLocation?.lat && responderLocation?.lng) {
      if (markersRef.current.responder) {
        markersRef.current.responder.setLatLng([responderLocation.lat, responderLocation.lng]);
      } else {
        markersRef.current.responder = L.marker([responderLocation.lat, responderLocation.lng], { icon: responderIcon })
          .addTo(map)
          .bindPopup('<b>Active Responder Unit</b><br>En route / on scene.');
      }
    } else if (markersRef.current.responder) {
      markersRef.current.responder.remove();
      delete markersRef.current.responder;
    }

    // Render connecting polyline if both exist
    if (victimLocation?.lat && victimLocation?.lng && responderLocation?.lat && responderLocation?.lng) {
      const latlngs: [number, number][] = [
        [victimLocation.lat, victimLocation.lng],
        [responderLocation.lat, responderLocation.lng]
      ];
      if (polylineRef.current) {
        polylineRef.current.setLatLngs(latlngs);
      } else {
        polylineRef.current = L.polyline(latlngs, {
          color: '#3b82f6',
          weight: 3,
          dashArray: '6, 8',
          opacity: 0.85
        }).addTo(map);
      }

      const bounds = L.latLngBounds(
        [victimLocation.lat, victimLocation.lng],
        [responderLocation.lat, responderLocation.lng]
      );
      map.fitBounds(bounds, { padding: [60, 60], maxZoom: 16 });
    } else {
      if (polylineRef.current) {
        polylineRef.current.remove();
        polylineRef.current = null;
      }
      if (victimLocation?.lat && victimLocation?.lng) {
        map.panTo([victimLocation.lat, victimLocation.lng]);
      }
    }

    // Render danger alerts
    alerts.forEach((alert) => {
      const id = `alert_${alert._id}`;
      if (!markersRef.current[id] && alert.location?.lat) {
        markersRef.current[id] = L.marker([alert.location.lat, alert.location.lng], { icon: alertIcon })
          .addTo(map)
          .bindPopup(`
            <div style="font-family: sans-serif; min-width: 140px;">
              <b style="color: #b45309; font-size: 13px;">${alert.title}</b><br/>
              <span style="font-size: 11px; font-weight: bold; color: #475569;">[${alert.severity} — ${alert.type}]</span>
              <p style="margin: 4px 0 0; font-size: 11px; color: #334155;">${alert.description}</p>
            </div>
          `);
      }
    });

    // Invalidate map size to prevent rendering tile gaps
    setTimeout(() => {
      map.invalidateSize();
    }, 150);
  }, [victimLocation, responderLocation, alerts]);

  const hasVictimAndResponder =
    victimLocation?.lat &&
    victimLocation?.lng &&
    responderLocation?.lat &&
    responderLocation?.lng;

  const distance = hasVictimAndResponder
    ? getDistanceFromLatLonInKm(
        victimLocation!.lat,
        victimLocation!.lng,
        responderLocation!.lat!,
        responderLocation!.lng!
      )
    : null;

  return (
    <div className="relative w-full rounded-2xl overflow-hidden border border-slate-800 shadow-2xl bg-slate-900">
      <div ref={mapContainerRef} style={{ height }} className="w-full" />
      {distance && (
        <div className="absolute top-3 right-3 bg-slate-900/95 backdrop-blur-md border border-slate-700 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-100 z-[1000] shadow-xl flex items-center gap-2.5">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-ping"></span>
          <span>
            Distance to Unit: <span className="text-blue-400 font-mono text-sm font-black">{distance} km</span>
          </span>
        </div>
      )}
      {onLocationSelect && (
        <div className="absolute bottom-3 left-3 bg-slate-900/90 backdrop-blur-md border border-slate-800 px-3 py-1.5 rounded-lg text-[11px] text-slate-300 z-[1000] shadow">
          Tip: Click anywhere on the map to place coordinates
        </div>
      )}
    </div>
  );
}
