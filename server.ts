import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { createApiRouter, AuthRequest } from './server/routes.js';
import { db } from './server/db.js';

dotenv.config();

const app = express();
const server = http.createServer(app);

// Socket.IO configuration
const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    credentials: true
  }
});

// Middleware
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// Inject io into every request
app.use((req: AuthRequest, _res, next) => {
  req.io = io;
  next();
});

// Mount API routes
app.use('/api', createApiRouter());

// Socket.IO real-time event handlers
io.on('connection', (socket) => {
  // Join a room specific to an emergency incident
  socket.on('join_incident', (incidentId: string) => {
    socket.join(`incident_${incidentId}`);
  });

  socket.on('leave_incident', (incidentId: string) => {
    socket.leave(`incident_${incidentId}`);
  });

  // Real-time responder GPS movement
  socket.on('responder_location_update', (payload: { incidentId?: string; responderId: string; lat: number; lng: number }) => {
    const { incidentId, responderId, lat, lng } = payload;
    if (lat == null || lng == null) return;

    const now = new Date().toISOString();

    if (responderId) {
      db.updateUser(responderId, {
        currentLocation: { lat, lng, updatedAt: now }
      });
    }

    if (incidentId) {
      db.updateIncident(incidentId, {
        responderLocation: { lat, lng, updatedAt: now }
      });

      // Broadcast to clients in this incident room
      io.to(`incident_${incidentId}`).emit('responder_moved', {
        incidentId,
        responderLocation: { lat, lng, updatedAt: now }
      });
    }
  });

  socket.on('disconnect', () => {});
});

const isProduction = process.env.NODE_ENV === 'production';
const PORT = Number(process.env.PORT) || 3000;

async function startServer() {
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true }
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[RescueNet] Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[RescueNet] Startup error:', err);
});
