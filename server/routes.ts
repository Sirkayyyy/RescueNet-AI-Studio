import express, { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { db, User } from './db.js';
import { classifyEmergency } from './aiService.js';

const JWT_SECRET = process.env.JWT_SECRET || 'super_emergency_jwt_secret_key_change_in_production';

export interface AuthRequest extends Request {
  user?: User;
  io?: any;
}

const generateToken = (id: string) => {
  return jwt.sign({ id }, JWT_SECRET, { expiresIn: '7d' });
};

export const protect = (req: AuthRequest, res: Response, next: NextFunction) => {
  let token: string | undefined;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, JWT_SECRET) as { id: string };
      const user = db.findUserById(decoded.id);
      if (!user) {
        return res.status(401).json({ message: 'User does not exist' });
      }
      req.user = user;
      return next();
    } catch {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }
  }

  return res.status(401).json({ message: 'No authorization token provided' });
};

export const authorize = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        message: `Forbidden: role '${req.user?.role}' lacks permissions.`
      });
    }
    next();
  };
};

export const createApiRouter = () => {
  const router = express.Router();

  // --- HEALTH ---
  router.get('/health', (_req, res) => {
    res.json({
      status: 'ACTIVE',
      service: 'RescueNet Emergency Core',
      timestamp: new Date().toISOString()
    });
  });

  // --- AUTH ROUTES ---
  router.post('/auth/register', (req: AuthRequest, res: Response) => {
    const { name, email, password, role, phone } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({ message: 'Name, email, and password are required' });
    }

    const existing = db.findUserByEmail(email);
    if (existing) {
      return res.status(400).json({ message: 'User already exists with this email address' });
    }

    const assignedRole = ['USER', 'RESPONDER', 'ADMIN'].includes(role) ? role : 'USER';
    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync(password, salt);

    const user = db.createUser({
      name,
      email,
      password: hashedPassword,
      role: assignedRole,
      phone: phone || ''
    });

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      emergencyContacts: user.emergencyContacts,
      token: generateToken(user._id)
    });
  });

  router.post('/auth/login', (req: AuthRequest, res: Response) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = db.findUserByEmail(email);
    if (user && bcrypt.compareSync(password, user.password)) {
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        emergencyContacts: user.emergencyContacts,
        token: generateToken(user._id)
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  });

  router.get('/auth/me', protect, (req: AuthRequest, res: Response) => {
    const { password, ...safeUser } = req.user!;
    res.json(safeUser);
  });

  router.post('/auth/contacts', protect, (req: AuthRequest, res: Response) => {
    const { name, phone, relationship } = req.body;
    if (!name || !phone) {
      return res.status(400).json({ message: 'Contact name and phone are required' });
    }

    const newContact = {
      _id: 'cnt_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      name,
      phone,
      relationship: relationship || 'Family'
    };

    const contacts = [...req.user!.emergencyContacts, newContact];
    const updated = db.updateUser(req.user!._id, { emergencyContacts: contacts });
    res.status(201).json(updated?.emergencyContacts || contacts);
  });

  router.delete('/auth/contacts/:id', protect, (req: AuthRequest, res: Response) => {
    const contacts = req.user!.emergencyContacts.filter((c) => c._id !== req.params.id);
    const updated = db.updateUser(req.user!._id, { emergencyContacts: contacts });
    res.json(updated?.emergencyContacts || contacts);
  });

  router.patch('/auth/responder/toggle-availability', protect, authorize('RESPONDER'), (req: AuthRequest, res: Response) => {
    const newAvail = !req.user!.isAvailable;
    const updated = db.updateUser(req.user!._id, { isAvailable: newAvail });
    res.json({ isAvailable: updated?.isAvailable });
  });

  router.patch('/auth/location', protect, (req: AuthRequest, res: Response) => {
    const { lat, lng } = req.body;
    if (lat == null || lng == null) {
      return res.status(400).json({ message: 'Valid latitude and longitude required' });
    }
    const updated = db.updateUser(req.user!._id, {
      currentLocation: {
        lat: Number(lat),
        lng: Number(lng),
        updatedAt: new Date().toISOString()
      }
    });
    res.json({ message: 'Location updated', currentLocation: updated?.currentLocation });
  });

  // --- INCIDENTS ---
  router.post('/incidents', protect, async (req: AuthRequest, res: Response) => {
    const { type, description, lat, lng, accuracy } = req.body;

    if (lat == null || lng == null) {
      return res.status(400).json({ message: 'Valid GPS coordinates (latitude, longitude) are required' });
    }

    const active = db.incidents.find(
      (i) => i.victim === req.user!._id && ['PENDING', 'ACCEPTED', 'EN_ROUTE', 'ARRIVED'].includes(i.status)
    );

    if (active) {
      return res.status(400).json({
        message: 'You already have an active SOS underway',
        incident: db.populateIncident(active)
      });
    }

    const aiAnalysis = await classifyEmergency(description, type);

    const incident = db.createIncident({
      victim: req.user!._id,
      type: aiAnalysis.category || type || 'OTHER',
      description: description || '',
      aiSummary: aiAnalysis.summary,
      aiPriority: aiAnalysis.priority,
      aiGuidance: aiAnalysis.guidance,
      location: { lat: Number(lat), lng: Number(lng), accuracy: Number(accuracy) || 0 },
      status: 'PENDING'
    });

    const populated = db.populateIncident(incident);

    // Broadcast real-time to all responders and admins
    if (req.io) {
      req.io.emit('new_incident_broadcast', populated);
    }

    res.status(201).json(populated);
  });

  router.get('/incidents/active', protect, (req: AuthRequest, res: Response) => {
    let incident = null;

    if (req.user!.role === 'RESPONDER') {
      const active = db.incidents.find(
        (i) => i.responder === req.user!._id && ['ACCEPTED', 'EN_ROUTE', 'ARRIVED'].includes(i.status)
      );
      if (active) incident = db.populateIncident(active);
    } else {
      const active = db.incidents.find(
        (i) => i.victim === req.user!._id && ['PENDING', 'ACCEPTED', 'EN_ROUTE', 'ARRIVED'].includes(i.status)
      );
      if (active) incident = db.populateIncident(active);
    }

    res.json(incident || null);
  });

  router.get('/incidents/pending', protect, authorize('RESPONDER', 'ADMIN'), (_req: AuthRequest, res: Response) => {
    const pending = db.incidents
      .filter((i) => i.status === 'PENDING')
      .map((i) => db.populateIncident(i));
    res.json(pending);
  });

  router.patch('/incidents/:id/accept', protect, authorize('RESPONDER'), (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const incident = db.findIncidentById(id);
    if (!incident) return res.status(404).json({ message: 'Incident not found' });
    if (incident.status !== 'PENDING') {
      return res.status(400).json({ message: 'Incident is already claimed or resolved' });
    }

    const updated = db.updateIncident(id, {
      responder: req.user!._id,
      status: 'ACCEPTED'
    });

    if (!updated) return res.status(500).json({ message: 'Failed to accept incident' });

    const populated = db.populateIncident(updated);

    if (req.io) {
      req.io.to(`incident_${updated._id}`).emit('incident_status_changed', populated);
      req.io.emit('incident_claimed', { incidentId: updated._id });
    }

    res.json(populated);
  });

  router.patch('/incidents/:id/status', protect, (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['ACCEPTED', 'EN_ROUTE', 'ARRIVED', 'RESOLVED', 'CANCELLED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status code' });
    }

    const incident = db.findIncidentById(id);
    if (!incident) return res.status(404).json({ message: 'Incident not found' });

    const isResponder = incident.responder === req.user!._id;
    const isVictim = incident.victim === req.user!._id;
    const isAdmin = req.user!.role === 'ADMIN';

    if (!isResponder && !isAdmin && (!isVictim || status !== 'CANCELLED')) {
      return res.status(403).json({ message: 'Not authorized to change this incident status' });
    }

    const updates: any = { status };
    if (status === 'RESOLVED' || status === 'CANCELLED') {
      updates.resolvedAt = new Date().toISOString();
    }

    const updated = db.updateIncident(id, updates);
    if (!updated) return res.status(500).json({ message: 'Update failed' });

    const populated = db.populateIncident(updated);

    if (req.io) {
      req.io.to(`incident_${updated._id}`).emit('incident_status_changed', populated);
    }

    res.json(populated);
  });

  router.patch('/incidents/:id/location', protect, (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { lat, lng, accuracy } = req.body;

    const incident = db.findIncidentById(id);
    if (!incident || incident.status === 'RESOLVED' || incident.status === 'CANCELLED') {
      return res.status(400).json({ message: 'Cannot update location on inactive incident' });
    }

    if (incident.victim !== req.user!._id) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const newLoc = { lat: Number(lat), lng: Number(lng), accuracy: Number(accuracy) || 0 };
    db.updateIncident(id, { location: newLoc });

    if (req.io) {
      req.io.to(`incident_${incident._id}`).emit('victim_location_update', {
        incidentId: incident._id,
        location: newLoc
      });
    }

    res.json({ message: 'Location updated', location: newLoc });
  });

  // --- ALERTS ---
  router.get('/alerts', protect, (req: AuthRequest, res: Response) => {
    const filter = req.user && req.user.role === 'ADMIN'
      ? db.alerts
      : db.alerts.filter((a) => ['VERIFIED', 'REPORTED'].includes(a.status));

    res.json(filter);
  });

  router.post('/alerts', protect, (req: AuthRequest, res: Response) => {
    const { title, type, severity, description, lat, lng, address, radiusMeters } = req.body;

    if (!title || !description || lat == null || lng == null) {
      return res.status(400).json({ message: 'Title, description, and location are required' });
    }

    const alert = db.createAlert({
      title,
      type: type || 'HAZARD',
      severity: severity || 'MODERATE',
      status: req.user!.role === 'ADMIN' ? 'VERIFIED' : 'REPORTED',
      description,
      location: {
        address: address || 'Current Zone',
        lat: Number(lat),
        lng: Number(lng),
        radiusMeters: Number(radiusMeters) || 1500
      },
      createdBy: req.user!._id,
      verifiedBy: req.user!.role === 'ADMIN' ? req.user!._id : null
    });

    if (req.io) {
      req.io.emit('new_danger_alert', alert);
    }

    res.status(201).json(alert);
  });

  router.patch('/alerts/:id/status', protect, authorize('ADMIN'), (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { status } = req.body;

    const alert = db.findAlertById(id);
    if (!alert) return res.status(404).json({ message: 'Alert not found' });

    const updated = db.updateAlert(id, {
      status,
      verifiedBy: status === 'VERIFIED' ? req.user!._id : alert.verifiedBy
    });

    if (req.io && updated) {
      req.io.emit('alert_status_updated', updated);
    }

    res.json(updated);
  });

  // --- ADMIN STATS & NUMBERS ---
  router.get('/admin/stats', protect, authorize('ADMIN'), (_req: AuthRequest, res: Response) => {
    const totalIncidents = db.incidents.length;
    const activeIncidents = db.incidents.filter((i) =>
      ['PENDING', 'ACCEPTED', 'EN_ROUTE', 'ARRIVED'].includes(i.status)
    ).length;
    const totalUsers = db.users.filter((u) => u.role === 'USER').length;
    const activeResponders = db.users.filter((u) => u.role === 'RESPONDER' && u.isAvailable).length;

    const recentIncidents = db.incidents
      .slice(0, 10)
      .map((i) => db.populateIncident(i));

    res.json({
      stats: { totalIncidents, activeIncidents, totalUsers, activeResponders },
      recentIncidents
    });
  });

  router.get('/admin/numbers', protect, (_req: AuthRequest, res: Response) => {
    res.json(db.emergencyNumbers);
  });

  router.post('/admin/numbers', protect, authorize('ADMIN'), (req: AuthRequest, res: Response) => {
    const { name, number, category, region } = req.body;
    if (!name || !number) {
      return res.status(400).json({ message: 'Name and number are required' });
    }

    const entry = db.createEmergencyNumber({ name, number, category, region });
    res.status(201).json(entry);
  });

  router.delete('/admin/numbers/:id', protect, authorize('ADMIN'), (req: AuthRequest, res: Response) => {
    const deleted = db.deleteEmergencyNumber(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Emergency number not found' });
    res.json({ message: 'Emergency number deleted' });
  });

  // --- AI ASSISTANT ---
  router.post('/ai/triage', protect, async (req: AuthRequest, res: Response) => {
    const { query, category } = req.body;
    if (!query) {
      return res.status(400).json({ message: 'An emergency description or query is required' });
    }

    try {
      const triageResult = await classifyEmergency(query, category || 'OTHER');
      res.json(triageResult);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  return router;
};
