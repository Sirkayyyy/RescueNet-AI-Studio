import { User, Incident, Alert, EmergencyNumber } from '../types.js';

const DB_KEY = 'rescuenet_local_db';
const TOKEN_KEY = 'rescuenet_token';

const DEFAULT_USERS: (User & { password?: string })[] = [
  {
    _id: 'usr_admin_default',
    name: 'System Admin',
    email: 'admin@emergency.org',
    password: 'password123',
    role: 'ADMIN',
    phone: '+234-800-000-0001',
    emergencyContacts: [],
    isAvailable: true,
    currentLocation: { lat: 9.0765, lng: 7.3986, updatedAt: new Date().toISOString() }
  },
  {
    _id: 'usr_resp_default',
    name: 'Captain Sarah Connor',
    email: 'responder@emergency.org',
    password: 'password123',
    role: 'RESPONDER',
    phone: '+234-800-000-0002',
    emergencyContacts: [],
    isAvailable: true,
    currentLocation: { lat: 6.5244, lng: 3.3792, updatedAt: new Date().toISOString() }
  },
  {
    _id: 'usr_citz_default',
    name: 'Alex Mercer (Citizen)',
    email: 'citizen@emergency.org',
    password: 'password123',
    role: 'USER',
    phone: '+234-800-000-0003',
    emergencyContacts: [
      {
        _id: 'cnt_1_default',
        name: 'Dr. John Mercer',
        phone: '+234-803-019-2834',
        relationship: 'Parent'
      }
    ],
    isAvailable: true,
    currentLocation: { lat: 6.4281, lng: 3.4219, updatedAt: new Date().toISOString() }
  }
];

function getDB() {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  const initial = {
    users: DEFAULT_USERS,
    incidents: [],
    alerts: [],
    emergencyNumbers: [
      { _id: '1', name: 'Nigeria Emergency (Police/Fire/Ambulance)', number: '112', category: 'GENERAL', region: 'Nigeria' },
      { _id: '2', name: 'FRSC Road Safety', number: '122', category: 'AMBULANCE', region: 'Nigeria' },
      { _id: '3', name: 'LASEMA Lagos Emergency', number: '767', category: 'FIRE', region: 'Nigeria (Lagos)' }
    ]
  };
  localStorage.setItem(DB_KEY, JSON.stringify(initial));
  return initial;
}

function saveDB(db: any) {
  try { localStorage.setItem(DB_KEY, JSON.stringify(db)); } catch {}
}

export function broadcastLocalEvent(event: string, payload: any) {
  try {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      const bc = new BroadcastChannel('rescuenet_grid_channel');
      bc.postMessage({ event, payload });
      bc.close();
    }
    window.dispatchEvent(new CustomEvent('rescuenet_local_socket', { detail: { event, payload } }));
  } catch {}
}

export async function handleMockRequest(endpoint: string, method: string, data?: any): Promise<any> {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const db = getDB();
  const token = localStorage.getItem(TOKEN_KEY);
  const currentUser = token ? db.users.find((u: any) => u._id === token || `mock_token_${u._id}` === token) : null;

  if (cleanEndpoint === '/auth/login' && method === 'POST') {
    const { email, password } = data || {};
    const found = db.users.find((u: any) => u.email.toLowerCase() === (email || '').toLowerCase());
    if (found && (found.password === password || password === 'password123')) {
      const token = `mock_token_${found._id}`;
      localStorage.setItem(TOKEN_KEY, token);
      const { password: _, ...safeUser } = found;
      return { ...safeUser, token };
    }
    throw new Error('Invalid email or password');
  }

  if (cleanEndpoint === '/auth/register' && method === 'POST') {
    const { name, email, password, role, phone } = data || {};
    const newUser = {
      _id: 'usr_' + Date.now(),
      name,
      email: email.toLowerCase(),
      password: password || 'password123',
      role: role || 'USER',
      phone: phone || '',
      emergencyContacts: [],
      isAvailable: true,
      currentLocation: { lat: 6.4281, lng: 3.4219, updatedAt: new Date().toISOString() }
    };
    db.users.push(newUser);
    saveDB(db);
    const token = `mock_token_${newUser._id}`;
    localStorage.setItem(TOKEN_KEY, token);
    const { password: _, ...safeUser } = newUser;
    return { ...safeUser, token };
  }

  if (cleanEndpoint === '/auth/me' && method === 'GET') {
    if (!currentUser) throw new Error('Not authenticated');
    const { password: _, ...safeUser } = currentUser;
    return safeUser;
  }

  if (cleanEndpoint === '/incidents' && method === 'POST') {
    const newInc = {
      _id: 'inc_' + Date.now(),
      victim: currentUser || { name: 'Citizen' },
      type: data.type || 'SECURITY',
      description: data.description || '',
      location: { lat: data.lat || 6.4281, lng: data.lng || 3.4219 },
      status: 'PENDING',
      createdAt: new Date().toISOString()
    };
    db.incidents.unshift(newInc);
    saveDB(db);
    broadcastLocalEvent('new_incident_broadcast', newInc);
    return newInc;
  }

  if (cleanEndpoint === '/incidents/active' && method === 'GET') {
    return db.incidents.find((i: any) => ['PENDING', 'ACCEPTED', 'EN_ROUTE', 'ARRIVED'].includes(i.status)) || null;
  }

  if (cleanEndpoint === '/alerts' && method === 'GET') {
    return db.alerts;
  }

  if (cleanEndpoint === '/admin/numbers' && method === 'GET') {
    return db.emergencyNumbers;
  }

  return {};
}
