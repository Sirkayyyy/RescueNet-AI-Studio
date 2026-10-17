import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';

export interface User {
  _id: string;
  name: string;
  email: string;
  password: string; // hashed
  role: 'USER' | 'RESPONDER' | 'ADMIN';
  phone: string;
  emergencyContacts: {
    _id: string;
    name: string;
    phone: string;
    relationship: string;
  }[];
  isAvailable: boolean;
  currentLocation: {
    lat: number | null;
    lng: number | null;
    updatedAt: string | null;
  };
  createdAt: string;
  updatedAt: string;
}

export interface Incident {
  _id: string;
  victim: string | User;
  responder: string | User | null;
  type: 'SECURITY' | 'MEDICAL' | 'FIRE' | 'ACCIDENT' | 'OTHER';
  description: string;
  aiSummary: string;
  aiPriority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  aiGuidance: string;
  location: {
    lat: number;
    lng: number;
    accuracy: number;
  };
  responderLocation: {
    lat: number | null;
    lng: number | null;
    updatedAt: string | null;
  };
  status: 'PENDING' | 'ACCEPTED' | 'EN_ROUTE' | 'ARRIVED' | 'RESOLVED' | 'CANCELLED';
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Alert {
  _id: string;
  title: string;
  type: 'SECURITY' | 'FIRE' | 'ACCIDENT' | 'WEATHER' | 'HAZARD' | 'OTHER';
  severity: 'LOW' | 'MODERATE' | 'SEVERE' | 'EXTREME';
  status: 'REPORTED' | 'VERIFIED' | 'RESOLVED';
  description: string;
  location: {
    address: string;
    lat: number;
    lng: number;
    radiusMeters: number;
  };
  createdBy: string | User;
  verifiedBy: string | User | null;
  createdAt: string;
  updatedAt: string;
}

export interface EmergencyNumber {
  _id: string;
  name: string;
  number: string;
  category: 'POLICE' | 'AMBULANCE' | 'FIRE' | 'DISASTER' | 'GENERAL';
  region: string;
  createdAt: string;
  updatedAt: string;
}

interface DBData {
  users: User[];
  incidents: Incident[];
  alerts: Alert[];
  emergencyNumbers: EmergencyNumber[];
}

const DB_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DB_DIR, 'rescuenet.json');

class Database {
  private data: DBData = {
    users: [],
    incidents: [],
    alerts: [],
    emergencyNumbers: []
  };

  constructor() {
    this.init();
  }

  private init() {
    try {
      if (!fs.existsSync(DB_DIR)) {
        fs.mkdirSync(DB_DIR, { recursive: true });
      }

      if (fs.existsSync(DB_FILE)) {
        const content = fs.readFileSync(DB_FILE, 'utf-8');
        this.data = JSON.parse(content);
        // Ensure Nigeria numbers exist
        if (!this.data.emergencyNumbers.some((n) => n.number === '112')) {
          this.seedDefaults();
        }
      } else {
        this.seedDefaults();
      }
    } catch (e) {
      console.warn('[Database] Initializing in-memory fallback:', e);
      this.seedDefaults();
    }
  }

  private save() {
    try {
      if (!fs.existsSync(DB_DIR)) {
        fs.mkdirSync(DB_DIR, { recursive: true });
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (e) {
      console.error('[Database Save Error]', e);
    }
  }

  private seedDefaults() {
    const salt = bcrypt.genSaltSync(10);
    const defaultPasswordHash = bcrypt.hashSync('password123', salt);
    const now = new Date().toISOString();

    const adminId = 'usr_admin_' + Date.now();
    const responderId = 'usr_resp_' + Date.now();
    const citizenId = 'usr_citz_' + Date.now();

    this.data.users = [
      {
        _id: adminId,
        name: 'System Admin',
        email: 'admin@emergency.org',
        password: defaultPasswordHash,
        role: 'ADMIN',
        phone: '+1-800-000-0001',
        emergencyContacts: [],
        isAvailable: true,
        currentLocation: { lat: 40.7128, lng: -74.006, updatedAt: now },
        createdAt: now,
        updatedAt: now
      },
      {
        _id: responderId,
        name: 'Captain Sarah Connor',
        email: 'responder@emergency.org',
        password: defaultPasswordHash,
        role: 'RESPONDER',
        phone: '+1-800-000-0002',
        emergencyContacts: [],
        isAvailable: true,
        currentLocation: { lat: 40.715, lng: -74.002, updatedAt: now },
        createdAt: now,
        updatedAt: now
      },
      {
        _id: citizenId,
        name: 'Alex Mercer (Citizen)',
        email: 'citizen@emergency.org',
        password: defaultPasswordHash,
        role: 'USER',
        phone: '+1-800-000-0003',
        emergencyContacts: [
          {
            _id: 'cnt_1_' + Date.now(),
            name: 'Dr. John Mercer',
            phone: '+1-555-019-2834',
            relationship: 'Parent'
          },
          {
            _id: 'cnt_2_' + Date.now(),
            name: 'Emergency Support Unit',
            phone: '+1-555-019-9999',
            relationship: 'Guardian'
          }
        ],
        isAvailable: true,
        currentLocation: { lat: 40.7128, lng: -74.006, updatedAt: now },
        createdAt: now,
        updatedAt: now
      }
    ];

    this.data.emergencyNumbers = [
      {
        _id: 'num_ng_1',
        name: 'Nigeria National Emergency (Toll-Free)',
        number: '112',
        category: 'GENERAL',
        region: 'Nigeria',
        createdAt: now,
        updatedAt: now
      },
      {
        _id: 'num_ng_2',
        name: 'Nigeria Police Emergency Hotline',
        number: '112',
        category: 'POLICE',
        region: 'Nigeria',
        createdAt: now,
        updatedAt: now
      },
      {
        _id: 'num_ng_3',
        name: 'Federal Road Safety Corps (FRSC Nigeria)',
        number: '122',
        category: 'AMBULANCE',
        region: 'Nigeria',
        createdAt: now,
        updatedAt: now
      },
      {
        _id: 'num_ng_4',
        name: 'LASEMA Lagos Emergency Management',
        number: '767',
        category: 'FIRE',
        region: 'Nigeria (Lagos)',
        createdAt: now,
        updatedAt: now
      },
      {
        _id: 'num_ng_5',
        name: 'NEMA National Disaster Agency',
        number: '080022556362',
        category: 'DISASTER',
        region: 'Nigeria',
        createdAt: now,
        updatedAt: now
      },
      {
        _id: 'num_1',
        name: 'Police Dispatch (US)',
        number: '911',
        category: 'POLICE',
        region: 'United States',
        createdAt: now,
        updatedAt: now
      },
      {
        _id: 'num_2',
        name: 'Ambulance & Paramedics (US)',
        number: '911',
        category: 'AMBULANCE',
        region: 'United States',
        createdAt: now,
        updatedAt: now
      },
      {
        _id: 'num_3',
        name: 'Fire & Rescue Service (US)',
        number: '911',
        category: 'FIRE',
        region: 'United States',
        createdAt: now,
        updatedAt: now
      },
      {
        _id: 'num_4',
        name: 'National Poison Center',
        number: '18002221222',
        category: 'GENERAL',
        region: 'International',
        createdAt: now,
        updatedAt: now
      },
      {
        _id: 'num_5',
        name: 'Crisis Support Line',
        number: '988',
        category: 'GENERAL',
        region: 'International',
        createdAt: now,
        updatedAt: now
      }
    ];

    this.data.alerts = [
      {
        _id: 'alt_ng_1',
        title: 'Lagos Island Flash Flood Warning',
        type: 'WEATHER',
        severity: 'SEVERE',
        status: 'VERIFIED',
        description: 'Heavy precipitation causing drainage overflow along Marina and Lekki-Epe Expressway corridors. Commuters advised to avoid low bridges.',
        location: {
          address: 'Marina & Lekki Corridor, Lagos, Nigeria',
          lat: 6.4549,
          lng: 3.4246,
          radiusMeters: 3000
        },
        createdBy: adminId,
        verifiedBy: adminId,
        createdAt: now,
        updatedAt: now
      },
      {
        _id: 'alt_ng_2',
        title: 'Abuja Express Highway Gridlock & Hazard',
        type: 'ACCIDENT',
        severity: 'MODERATE',
        status: 'VERIFIED',
        description: 'Multi-vehicle obstruction near Lugbe junction along Airport Road. FRSC rescue team deployed.',
        location: {
          address: 'Airport Road, Abuja, Nigeria',
          lat: 9.0064,
          lng: 7.3712,
          radiusMeters: 2000
        },
        createdBy: adminId,
        verifiedBy: adminId,
        createdAt: now,
        updatedAt: now
      },
      {
        _id: 'alt_1',
        title: 'Flash Flood Hazard Alert',
        type: 'WEATHER',
        severity: 'SEVERE',
        status: 'VERIFIED',
        description: 'Rising water levels observed near downtown river valley. Low-lying roads closed. Avoid flood-prone bridges.',
        location: {
          address: 'Downtown Riverfront Sector',
          lat: 40.7128,
          lng: -74.006,
          radiusMeters: 2500
        },
        createdBy: adminId,
        verifiedBy: adminId,
        createdAt: now,
        updatedAt: now
      }
    ];

    this.data.incidents = [];
    this.save();
    console.log('[Database] Seeded with default users, numbers, and danger alerts.');
  }

  // User queries
  get users() {
    return this.data.users;
  }

  findUserById(id: string): User | undefined {
    return this.data.users.find((u) => u._id === id);
  }

  findUserByEmail(email: string): User | undefined {
    return this.data.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  }

  createUser(userData: Partial<User>): User {
    const now = new Date().toISOString();
    const newUser: User = {
      _id: 'usr_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      name: userData.name || '',
      email: (userData.email || '').toLowerCase().trim(),
      password: userData.password || '',
      role: userData.role || 'USER',
      phone: userData.phone || '',
      emergencyContacts: userData.emergencyContacts || [],
      isAvailable: userData.isAvailable ?? true,
      currentLocation: userData.currentLocation || { lat: null, lng: null, updatedAt: null },
      createdAt: now,
      updatedAt: now
    };
    this.data.users.push(newUser);
    this.save();
    return newUser;
  }

  updateUser(id: string, updates: Partial<User>): User | null {
    const idx = this.data.users.findIndex((u) => u._id === id);
    if (idx === -1) return null;
    this.data.users[idx] = {
      ...this.data.users[idx],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    this.save();
    return this.data.users[idx];
  }

  // Incidents
  get incidents() {
    return this.data.incidents;
  }

  findIncidentById(id: string): Incident | undefined {
    return this.data.incidents.find((i) => i._id === id);
  }

  createIncident(incidentData: Partial<Incident>): Incident {
    const now = new Date().toISOString();
    const newInc: Incident = {
      _id: 'inc_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      victim: incidentData.victim!,
      responder: incidentData.responder || null,
      type: incidentData.type || 'OTHER',
      description: incidentData.description || '',
      aiSummary: incidentData.aiSummary || '',
      aiPriority: incidentData.aiPriority || 'HIGH',
      aiGuidance: incidentData.aiGuidance || '',
      location: incidentData.location || { lat: 40.7128, lng: -74.006, accuracy: 0 },
      responderLocation: incidentData.responderLocation || { lat: null, lng: null, updatedAt: null },
      status: incidentData.status || 'PENDING',
      resolvedAt: incidentData.resolvedAt || null,
      createdAt: now,
      updatedAt: now
    };
    this.data.incidents.unshift(newInc);
    this.save();
    return newInc;
  }

  updateIncident(id: string, updates: Partial<Incident>): Incident | null {
    const idx = this.data.incidents.findIndex((i) => i._id === id);
    if (idx === -1) return null;
    this.data.incidents[idx] = {
      ...this.data.incidents[idx],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    this.save();
    return this.data.incidents[idx];
  }

  populateIncident(incident: Incident): any {
    const victim = typeof incident.victim === 'string'
      ? this.findUserById(incident.victim)
      : incident.victim;

    const responder = typeof incident.responder === 'string'
      ? this.findUserById(incident.responder)
      : incident.responder;

    return {
      ...incident,
      victim: victim
        ? {
            _id: victim._id,
            name: victim.name,
            phone: victim.phone,
            emergencyContacts: victim.emergencyContacts
          }
        : null,
      responder: responder
        ? {
            _id: responder._id,
            name: responder.name,
            phone: responder.phone,
            isAvailable: responder.isAvailable,
            currentLocation: responder.currentLocation
          }
        : null
    };
  }

  // Alerts
  get alerts() {
    return this.data.alerts;
  }

  findAlertById(id: string): Alert | undefined {
    return this.data.alerts.find((a) => a._id === id);
  }

  createAlert(alertData: Partial<Alert>): Alert {
    const now = new Date().toISOString();
    const newAlert: Alert = {
      _id: 'alt_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      title: alertData.title || '',
      type: alertData.type || 'HAZARD',
      severity: alertData.severity || 'MODERATE',
      status: alertData.status || 'REPORTED',
      description: alertData.description || '',
      location: alertData.location || {
        address: 'Current Zone',
        lat: 40.7128,
        lng: -74.006,
        radiusMeters: 1500
      },
      createdBy: alertData.createdBy || '',
      verifiedBy: alertData.verifiedBy || null,
      createdAt: now,
      updatedAt: now
    };
    this.data.alerts.unshift(newAlert);
    this.save();
    return newAlert;
  }

  updateAlert(id: string, updates: Partial<Alert>): Alert | null {
    const idx = this.data.alerts.findIndex((a) => a._id === id);
    if (idx === -1) return null;
    this.data.alerts[idx] = {
      ...this.data.alerts[idx],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    this.save();
    return this.data.alerts[idx];
  }

  // Emergency Numbers
  get emergencyNumbers() {
    return this.data.emergencyNumbers;
  }

  createEmergencyNumber(numData: Partial<EmergencyNumber>): EmergencyNumber {
    const now = new Date().toISOString();
    const newNum: EmergencyNumber = {
      _id: 'num_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      name: numData.name || '',
      number: numData.number || '',
      category: numData.category || 'GENERAL',
      region: numData.region || 'National',
      createdAt: now,
      updatedAt: now
    };
    this.data.emergencyNumbers.push(newNum);
    this.save();
    return newNum;
  }

  deleteEmergencyNumber(id: string): boolean {
    const initialLen = this.data.emergencyNumbers.length;
    this.data.emergencyNumbers = this.data.emergencyNumbers.filter((n) => n._id !== id);
    if (this.data.emergencyNumbers.length !== initialLen) {
      this.save();
      return true;
    }
    return false;
  }
}

export const db = new Database();
