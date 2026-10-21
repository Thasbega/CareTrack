import dotenv from 'dotenv';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from './models/User.js';
import HealthRecord from './models/HealthRecord.js';
import Appointment from './models/Appointment.js';
import Medication from './models/Medication.js';
dotenv.config();

await mongoose.connect(process.env.MONGO_URI);

const demoEmails = ['admin@example.com', 'doctor@example.com', 'patient@example.com'];
await User.deleteMany({ email: { $in: demoEmails } });

const password = await bcrypt.hash('Password123', 10);
const [admin, doctor, patient] = await User.create([
  { name: 'System Admin', email: 'admin@example.com', password, role: 'admin' },
  { name: 'Dr. Asha Rao', email: 'doctor@example.com', password, role: 'doctor', specialization: 'General Medicine' },
  { name: 'Demo Patient', email: 'patient@example.com', password, role: 'patient', gender: 'Female', bloodGroup: 'O+' }
]);

// A few days of sample readings so the dashboard chart isn't empty on first login
await HealthRecord.deleteMany({ patient: patient._id });
const now = Date.now();
const readings = Array.from({ length: 6 }).map((_, i) => ({
  patient: patient._id,
  heartRate: 68 + Math.round(Math.random() * 14),
  systolic: 112 + Math.round(Math.random() * 10),
  diastolic: 74 + Math.round(Math.random() * 6),
  spo2: 96 + Math.round(Math.random() * 3),
  temperature: 97.8 + Math.random(),
  bloodSugar: 90 + Math.round(Math.random() * 20),
  weight: 62,
  status: 'normal',
  recordedAt: new Date(now - (5 - i) * 24 * 60 * 60 * 1000)
}));
await HealthRecord.insertMany(readings);

await Appointment.deleteMany({ patient: patient._id });
await Appointment.create({
  patient: patient._id,
  doctor: doctor._id,
  date: new Date(now + 2 * 24 * 60 * 60 * 1000),
  reason: 'Routine check-up',
  status: 'pending'
});

await Medication.deleteMany({ patient: patient._id });
await Medication.create({ patient: patient._id, name: 'Metformin', dosage: '500mg', time: '08:00', frequency: 'Twice daily' });

console.log('Seeded demo data.');
console.log('Admin:   admin@example.com / Password123');
console.log('Doctor:  doctor@example.com / Password123');
console.log('Patient: patient@example.com / Password123');
await mongoose.disconnect();
