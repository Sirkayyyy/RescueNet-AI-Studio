import React, { useState, useEffect } from 'react';
import { useLocation, PRESET_LOCATIONS, LocationItem } from '../context/LocationContext.js';
import EmergencyMap from './EmergencyMap.js';
import {
  MapPin,
  Search,
  Navigation,
  Check,
  X,
  Compass,
  AlertCircle,
  Globe2,
  Sparkles
} from 'lucide-react';

export default function LocationPickerModal() {
  const {
    currentLocation,
    setLocation,
    updateCoordinates,
    detectGPS,
    isDetectingGPS,
    gpsError,
    searchLocations,
    isLocationModalOpen,
    setIsLocationModalOpen
  } = useLocation();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<LocationItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedCoords, setSelectedCoords] = useState<{ lat: number; lng: number }>({
    lat: currentLocation.lat,
    lng: currentLocation.lng
  });
  const [selectedName, setSelectedName] = useState(currentLocation.name);

  useEffect(() => {
    if (isLocationModalOpen) {
      setSelectedCoords({ lat: currentLocation.lat, lng: currentLocation.lng });
      setSelectedName(currentLocation.name);
      setSearchQuery('');
      setSearchResults([]);
    }
  }, [isLocationModalOpen, currentLocation]);

  if (!isLocationModalOpen) return null;

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    const results = await searchLocations(searchQuery);
    setSearchResults(results);
    setIsSearching(false);
  };

  const handleSelectPreset = (preset: LocationItem) => {
    setSelectedCoords({ lat: preset.lat, lng: preset.lng });
    setSelectedName(preset.name);
    setLocation(preset);
    setIsLocationModalOpen(false);
  };

  const handleMapClick = async (coords: { lat: number; lng: number }) => {
    setSelectedCoords(coords);
    setSelectedName(`Custom Pin: ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`);
  };

  const handleConfirmLocation = async () => {
    await updateCoordinates(selectedCoords.lat, selectedCoords.lng, selectedName);
    setIsLocationModalOpen(false);
  };

  const handleUseGPS = async () => {
    const success = await detectGPS();
    if (success) {
      setIsLocationModalOpen(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-5 my-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-red-600/20 border border-red-500/30 rounded-xl text-red-400">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <span>Set Operational Location</span>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-950 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded-full">
                  Nigeria & Global
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                RescueNet dispatches incidents and alerts based on your configured region.
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsLocationModalOpen(false)}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* GPS Detection & Search Bar */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <form onSubmit={handleSearch} className="flex-1 flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="text"
                  placeholder="Search city, district, or street (e.g. Ikeja, Lagos, or Abuja)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500"
                />
              </div>
              <button
                type="submit"
                disabled={isSearching}
                className="px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isSearching ? 'Searching...' : 'Search'}
              </button>
            </form>

            <button
              onClick={handleUseGPS}
              disabled={isDetectingGPS}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-md shadow-blue-950/40 cursor-pointer disabled:opacity-50"
            >
              <Navigation className={`w-3.5 h-3.5 ${isDetectingGPS ? 'animate-spin' : ''}`} />
              {isDetectingGPS ? 'Detecting GPS...' : 'Use My Live GPS'}
            </button>
          </div>

          {gpsError && (
            <div className="p-2.5 bg-amber-950/50 border border-amber-800 rounded-xl text-amber-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{gpsError}</span>
            </div>
          )}

          {/* Search Results Dropdown */}
          {searchResults.length > 0 && (
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-2 max-h-48 overflow-y-auto space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-500 px-2 block">
                Found Locations:
              </span>
              {searchResults.map((result, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSelectPreset(result)}
                  className="w-full text-left p-2.5 rounded-xl text-xs hover:bg-slate-900 transition flex items-center justify-between text-slate-200 hover:text-white group"
                >
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-red-400 group-hover:scale-110 transition" />
                    <span>{result.name}</span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {result.countryName} ({result.emergencyNumber})
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Quick Presets for Nigeria */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] uppercase font-bold text-slate-400 flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-emerald-400" />
              Nigeria Quick Presets (Click to Select):
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {PRESET_LOCATIONS.filter((p) => p.country === 'NG').map((preset, idx) => {
              const isCurrent =
                Math.abs(currentLocation.lat - preset.lat) < 0.05 &&
                Math.abs(currentLocation.lng - preset.lng) < 0.05;

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectPreset(preset)}
                  className={`p-2.5 rounded-xl border text-left transition text-xs flex flex-col justify-between cursor-pointer ${
                    isCurrent
                      ? 'bg-emerald-950/40 border-emerald-500 text-emerald-300 font-bold shadow'
                      : 'bg-slate-950/70 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-950'
                  }`}
                >
                  <span className="truncate">{preset.name.split(' (')[0]}</span>
                  <span className="text-[10px] text-slate-500 mt-1 flex items-center justify-between">
                    <span>{preset.countryName}</span>
                    <span className="font-mono text-emerald-400">112</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Interactive Pin-Picker Map */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Or click on the map to place your pin:</span>
            <span className="text-slate-300 font-mono text-[11px]">
              Selected: {selectedCoords.lat.toFixed(4)}, {selectedCoords.lng.toFixed(4)}
            </span>
          </div>

          <EmergencyMap
            victimLocation={selectedCoords}
            onLocationSelect={handleMapClick}
            height="220px"
          />
        </div>

        {/* Footer info & confirm */}
        <div className="pt-3 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-400 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>
              Emergency Line in this region:{' '}
              <strong className="text-white font-mono">{currentLocation.emergencyNumber}</strong> (Nigeria: 112)
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => setIsLocationModalOpen(false)}
              className="flex-1 sm:flex-initial px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmLocation}
              className="flex-1 sm:flex-initial px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-lg shadow-red-950/50 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              Set Active Location
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
