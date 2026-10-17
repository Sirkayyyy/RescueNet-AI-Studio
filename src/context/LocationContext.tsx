import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import API from '../services/api.js';

export interface LocationItem {
  name: string;
  lat: number;
  lng: number;
  country: string;
  countryName: string;
  emergencyNumber: string;
}

export const PRESET_LOCATIONS: LocationItem[] = [
  // Nigeria Major Cities & Sectors
  {
    name: 'Lagos (Victoria Island & Lekki)',
    lat: 6.4281,
    lng: 3.4219,
    country: 'NG',
    countryName: 'Nigeria',
    emergencyNumber: '112'
  },
  {
    name: 'Lagos (Ikeja Capital)',
    lat: 6.5965,
    lng: 3.3421,
    country: 'NG',
    countryName: 'Nigeria',
    emergencyNumber: '112'
  },
  {
    name: 'Abuja (Federal Capital Territory)',
    lat: 9.0765,
    lng: 7.3986,
    country: 'NG',
    countryName: 'Nigeria',
    emergencyNumber: '112'
  },
  {
    name: 'Port Harcourt (Rivers State)',
    lat: 4.8156,
    lng: 7.0498,
    country: 'NG',
    countryName: 'Nigeria',
    emergencyNumber: '112'
  },
  {
    name: 'Ibadan (Oyo State)',
    lat: 7.3775,
    lng: 3.9470,
    country: 'NG',
    countryName: 'Nigeria',
    emergencyNumber: '112'
  },
  {
    name: 'Kano (Kano State)',
    lat: 12.0022,
    lng: 8.5920,
    country: 'NG',
    countryName: 'Nigeria',
    emergencyNumber: '112'
  },
  {
    name: 'Enugu (Coal City)',
    lat: 6.4584,
    lng: 7.5464,
    country: 'NG',
    countryName: 'Nigeria',
    emergencyNumber: '112'
  },
  // International / US Presets
  {
    name: 'New York (Downtown Metro)',
    lat: 40.7128,
    lng: -74.0060,
    country: 'US',
    countryName: 'United States',
    emergencyNumber: '911'
  },
  {
    name: 'London (Greater London)',
    lat: 51.5074,
    lng: -0.1278,
    country: 'GB',
    countryName: 'United Kingdom',
    emergencyNumber: '999'
  }
];

// Default initial location: Lagos, Nigeria as requested by user
export const DEFAULT_NIGERIA_LOCATION: LocationItem = PRESET_LOCATIONS[0];

interface LocationContextType {
  currentLocation: LocationItem;
  setLocation: (loc: LocationItem) => void;
  updateCoordinates: (lat: number, lng: number, customName?: string) => Promise<void>;
  detectGPS: () => Promise<boolean>;
  isDetectingGPS: boolean;
  gpsError: string | null;
  searchLocations: (query: string) => Promise<LocationItem[]>;
  isLocationModalOpen: boolean;
  setIsLocationModalOpen: (open: boolean) => void;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

export const LocationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentLocation, setCurrentLocation] = useState<LocationItem>(() => {
    try {
      const saved = localStorage.getItem('rescuenet_user_location');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // fallback
    }
    return DEFAULT_NIGERIA_LOCATION;
  });

  const [isDetectingGPS, setIsDetectingGPS] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);

  // Sync with localStorage
  const setLocation = (loc: LocationItem) => {
    setCurrentLocation(loc);
    try {
      localStorage.setItem('rescuenet_user_location', JSON.stringify(loc));
      API.patch('/auth/location', { lat: loc.lat, lng: loc.lng }).catch(() => {});
    } catch {
      // ignore
    }
  };

  // Reverse geocode when coordinates change manually (e.g. from map click)
  const updateCoordinates = async (lat: number, lng: number, customName?: string) => {
    let resolvedName = customName || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    let country = currentLocation.country;
    let countryName = currentLocation.countryName;
    let emergencyNumber = currentLocation.emergencyNumber;

    try {
      // Fetch reverse geocoding from OpenStreetMap Nominatim
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=14&addressdetails=1`,
        { headers: { 'Accept-Language': 'en' } }
      );
      if (response.ok) {
        const data = await response.json();
        if (data.display_name) {
          const parts = data.display_name.split(', ');
          resolvedName = parts.slice(0, 3).join(', ');
          const cc = data.address?.country_code?.toUpperCase();
          if (cc) {
            country = cc;
            countryName = data.address?.country || (cc === 'NG' ? 'Nigeria' : 'Global');
            emergencyNumber = cc === 'NG' ? '112' : cc === 'US' ? '911' : cc === 'GB' ? '999' : '112';
          }
        }
      }
    } catch {
      // Keep existing name or fallback coordinates
    }

    const updated: LocationItem = {
      name: resolvedName,
      lat,
      lng,
      country,
      countryName,
      emergencyNumber
    };
    setLocation(updated);
  };

  // Search OpenStreetMap Nominatim
  const searchLocations = async (query: string): Promise<LocationItem[]> => {
    if (!query || query.trim().length < 2) return [];

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=6&addressdetails=1`,
        { headers: { 'Accept-Language': 'en' } }
      );
      if (!response.ok) return [];
      const data = await response.json();

      return data.map((item: any) => {
        const cc = item.address?.country_code?.toUpperCase() || 'NG';
        const cName = item.address?.country || (cc === 'NG' ? 'Nigeria' : 'Global');
        return {
          name: item.display_name.split(', ').slice(0, 3).join(', '),
          lat: parseFloat(item.lat),
          lng: parseFloat(item.lon),
          country: cc,
          countryName: cName,
          emergencyNumber: cc === 'NG' ? '112' : cc === 'US' ? '911' : cc === 'GB' ? '999' : '112'
        };
      });
    } catch {
      return [];
    }
  };

  // Detect real GPS via browser
  const detectGPS = (): Promise<boolean> => {
    setIsDetectingGPS(true);
    setGpsError(null);

    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        setGpsError('Geolocation is not supported by your browser.');
        setIsDetectingGPS(false);
        resolve(false);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          await updateCoordinates(lat, lng, 'My Current Position');
          setIsDetectingGPS(false);
          resolve(true);
        },
        (error) => {
          setIsDetectingGPS(false);
          setGpsError(`GPS Notice: ${error.message}. You can manually pick a location or city below.`);
          resolve(false);
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    });
  };

  return (
    <LocationContext.Provider
      value={{
        currentLocation,
        setLocation,
        updateCoordinates,
        detectGPS,
        isDetectingGPS,
        gpsError,
        searchLocations,
        isLocationModalOpen,
        setIsLocationModalOpen
      }}
    >
      {children}
    </LocationContext.Provider>
  );
};

export const useLocation = (): LocationContextType => {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
};
