import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import { Server } from 'socket.io';

import authRoutes from './routes/authRoutes.js';
import healthRoutes from './routes/healthRoutes.js';
import appointmentRoutes from './routes/appointmentRoutes.js';
import patientRoutes from './routes/patientRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import medicationRoutes from './routes/medicationRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import messageRoutes from './routes/messageRoutes.js';
import documentRoutes from './routes/documentRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import insightsRoutes from './routes/insightsRoutes.js';
import emergencyRoutes from './routes/emergencyRoutes.js';
import { verifyToken } from './middleware/auth.js';

dotenv.config();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const httpServer = createServer(app);
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';
const allowedOrigins = new Set([CLIENT_URL, 'http://localhost:5173', 'http://localhost:5174']);
const corsOrigin = (origin, callback) => {
  if (!origin || allowedOrigins.has(origin)) return callback(null, true);
  return callback(new Error('CORS origin not allowed'));
};

const io = new Server(httpServer, {
  cors: { origin: corsOrigin }
});

app.use(cors({ origin: corsOrigin }));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Make io available to route handlers (req.app.get('io')) so REST actions
// can push real-time events (new message, new notification) to connected clients.
app.set('io', io);

app.get('/api/health-check', (req, res) => res.json({ message: 'Patient Monitoring API is running' }));
app.use('/api/auth', authRoutes);
app.use('/api/health', healthRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/medications', medicationRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/insights', insightsRoutes);
app.use('/api/emergency', emergencyRoutes);

app.use((req, res) => res.status(404).json({ message: 'Route not found' }));
app.use((err, req, res, next) => res.status(500).json({ message: err.message || 'Server error' }));

// Each authenticated socket joins a room named after their user id, so REST
// route handlers can target `user:<id>` to push live notifications/messages
// without keeping a separate socket registry.
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication required'));
    socket.user = await verifyToken(token);
    next();
  } catch (e) {
    next(new Error('Invalid or expired token'));
  }
});

io.on('connection', (socket) => {
  socket.join(`user:${socket.user._id}`);
  socket.on('disconnect', () => {});
});

const PORT = process.env.PORT || 5000;
mongoose.connect(process.env.MONGO_URI)
  .then(() => httpServer.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`)))
  .catch(err => { console.error('MongoDB connection failed:', err.message); process.exit(1); });
