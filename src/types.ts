export type UserRole = 'USER' | 'RESPONDER' | 'ADMIN';

export interface EmergencyContact {
  _id: string;
  name: string;
  phone: string;
  relationship: string;
}

export interface User {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  phone: string;
  emergencyContacts: EmergencyContact[];
  isAvailable?: boolean;
  currentLocation?: {
    lat: number | null;
    lng: number | null;
    updatedAt: string | null;
  };
  token?: string;
}

export type IncidentType = 'SECURITY' | 'MEDICAL' | 'FIRE' | 'ACCIDENT' | 'OTHER';
export type IncidentPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type IncidentStatus = 'PENDING' | 'ACCEPTED' | 'EN_ROUTE' | 'ARRIVED' | 'RESOLVED' | 'CANCELLED';

export interface IncidentLocation {
  lat: number;
  lng: number;
  accuracy?: number;
}

export interface Incident {
  _id: string;
  victim: {
    _id: string;
    name: string;
    phone: string;
    emergencyContacts?: EmergencyContact[];
  } | null;
  responder: {
    _id: string;
    name: string;
    phone: string;
    isAvailable?: boolean;
    currentLocation?: {
      lat: number | null;
      lng: number | null;
      updatedAt: string | null;
    };
  } | null;
  type: IncidentType;
  description: string;
  aiSummary: string;
  aiPriority: IncidentPriority;
  aiGuidance: string;
  location: IncidentLocation;
  responderLocation?: {
    lat: number | null;
    lng: number | null;
    updatedAt: string | null;
  };
  status: IncidentStatus;
  resolvedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type AlertType = 'SECURITY' | 'FIRE' | 'ACCIDENT' | 'WEATHER' | 'HAZARD' | 'OTHER';
export type AlertSeverity = 'LOW' | 'MODERATE' | 'SEVERE' | 'EXTREME';
export type AlertStatus = 'REPORTED' | 'VERIFIED' | 'RESOLVED';

export interface Alert {
  _id: string;
  title: string;
  type: AlertType;
  severity: AlertSeverity;
  status: AlertStatus;
  description: string;
  location: {
    address: string;
    lat: number;
    lng: number;
    radiusMeters: number;
  };
  createdBy: string | { _id: string; name: string };
  verifiedBy?: string | { _id: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface EmergencyNumber {
  _id: string;
  name: string;
  number: string;
  category: 'POLICE' | 'AMBULANCE' | 'FIRE' | 'DISASTER' | 'GENERAL';
  region: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AdminStats {
  totalIncidents: number;
  activeIncidents: number;
  totalUsers: number;
  activeResponders: number;
}
