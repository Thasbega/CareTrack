import { Router } from 'express';
import EmergencyAlert from '../models/EmergencyAlert.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';
import { protect, roles } from '../middleware/auth.js';

const router = Router();

router.post('/sos', protect, roles('patient'), async (req, res) => {
  try {
    const { latitude, longitude, message } = req.body;
    const hasLocation = Number.isFinite(Number(latitude)) && Number.isFinite(Number(longitude));
    const mapsUrl = hasLocation
      ? `https://www.google.com/maps?q=${encodeURIComponent(latitude)},${encodeURIComponent(longitude)}`
      : '';

    const alert = await EmergencyAlert.create({
      patient: req.user._id,
      latitude: hasLocation ? Number(latitude) : undefined,
      longitude: hasLocation ? Number(longitude) : undefined,
      mapsUrl,
      message: message || 'Emergency SOS activated by patient.'
    });

    const doctors = await User.find({ role: 'doctor', isActive: { $ne: false } }).select('_id');
    await Promise.all(doctors.map(d => Notification.create({
      user: d._id,
      title: '🚨 Emergency SOS',
      message: `${req.user.name} activated Emergency SOS${mapsUrl ? ` — ${mapsUrl}` : ''}`,
      type: 'emergency'
    })));

    const io = req.app.get('io');
    if (io) {
      doctors.forEach(d => io.to(`user:${d._id}`).emit('notification:new', {
        title: '🚨 Emergency SOS',
        message: `${req.user.name} activated Emergency SOS${mapsUrl ? ` — ${mapsUrl}` : ''}`,
        type: 'emergency'
      }));
    }

    res.status(201).json({
      id: alert._id,
      status: alert.status,
      createdAt: alert.createdAt,
      mapsUrl,
      message: 'Emergency SOS recorded. Your care team has been notified in the app.'
    });
  } catch (e) {
    res.status(400).json({ message: e.message || 'Could not activate SOS' });
  }
});

router.get('/history', protect, async (req, res) => {
  const query = req.user.role === 'patient' ? { patient: req.user._id } : {};
  const rows = await EmergencyAlert.find(query).populate('patient', 'name email').sort({ createdAt: -1 }).limit(50);
  res.json(rows);
});

router.patch('/:id/resolve', protect, roles('doctor', 'admin'), async (req, res) => {
  const row = await EmergencyAlert.findByIdAndUpdate(req.params.id, { status: 'resolved' }, { new: true });
  if (!row) return res.status(404).json({ message: 'Emergency alert not found' });
  res.json(row);
});

export default router;
