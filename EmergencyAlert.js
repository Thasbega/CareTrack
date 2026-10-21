import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  latitude: Number,
  longitude: Number,
  mapsUrl: String,
  message: { type: String, default: 'Emergency SOS activated by patient.' },
  status: { type: String, enum: ['active', 'resolved'], default: 'active' },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('EmergencyAlert', schema);
