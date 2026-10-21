import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  dosage: String,
  time: String,
  frequency: String,
  instructions: String,
  active: { type: Boolean, default: true },
  source: { type: String, enum: ['patient', 'doctor'], default: 'patient' },
  prescribedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  lastTakenAt: Date,
  takenDates: [Date]
}, { timestamps: true });

export default mongoose.model('Medication', schema);
