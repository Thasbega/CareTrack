import { Router } from 'express';
import Medication from '../models/Medication.js';
import Appointment from '../models/Appointment.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';
import { protect, roles } from '../middleware/auth.js';

const router = Router();

// Check if doctor can prescribe or manage medications for a patient
async function doctorCanManagePatient(doctorId, patientId) {
  if (!doctorId || !patientId) return false;
  // Any valid registered patient can receive medication prescriptions
  const patient = await User.findOne({ _id: patientId, role: 'patient' });
  return !!patient;
}

// GET /api/medications
// - Patients get their own medications populated with prescribing doctor info
// - Doctors get either medications for a specific patient (?patientId=...) OR all medications prescribed by them
// - Admins get all medications or filter by ?patientId=...
router.get('/', protect, async (req, res) => {
  try {
    if (req.user.role === 'patient') {
      const list = await Medication.find({ patient: req.user._id })
        .populate('prescribedBy', 'name email specialization')
        .sort({ createdAt: -1 });
      return res.json(list);
    }

    if (req.user.role === 'doctor') {
      if (req.query.patientId) {
        const list = await Medication.find({ patient: req.query.patientId })
          .populate('prescribedBy', 'name email specialization')
          .populate('patient', 'name email phone')
          .sort({ createdAt: -1 });
        return res.json(list);
      }
      // Return all medications prescribed by this doctor
      const list = await Medication.find({ prescribedBy: req.user._id })
        .populate('patient', 'name email phone gender')
        .populate('prescribedBy', 'name email specialization')
        .sort({ createdAt: -1 });
      return res.json(list);
    }

    if (req.user.role === 'admin') {
      const filter = req.query.patientId ? { patient: req.query.patientId } : {};
      const list = await Medication.find(filter)
        .populate('patient', 'name email phone')
        .populate('prescribedBy', 'name email')
        .sort({ createdAt: -1 });
      return res.json(list);
    }

    return res.json([]);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// POST /api/medications
// Patients add their own medication reminders; Doctors can also prescribe here if patientId given
router.post('/', protect, async (req, res) => {
  try {
    const { name, dosage, time, frequency, instructions, patientId } = req.body;
    if (!name) return res.status(400).json({ message: 'Medication name is required' });

    if (req.user.role === 'doctor') {
      const targetPatientId = patientId || req.body.patient;
      if (!targetPatientId) return res.status(400).json({ message: 'Please select a patient to prescribe medication' });
      const patient = await User.findOne({ _id: targetPatientId, role: 'patient' });
      if (!patient) return res.status(404).json({ message: 'Patient not found' });

      const med = await Medication.create({
        patient: targetPatientId,
        name,
        dosage,
        time,
        frequency,
        instructions,
        active: true,
        source: 'doctor',
        prescribedBy: req.user._id
      });

      await Notification.create({
        user: targetPatientId,
        title: 'New medication prescribed',
        message: `Dr. ${req.user.name} prescribed ${name}${dosage ? ` (${dosage})` : ''}${time ? ` at ${time}` : ''}.`,
        type: 'medication'
      });

      const io = req.app.get('io');
      if (io) {
        io.to(`user:${targetPatientId}`).emit('notification:new', {
          title: 'New medication prescribed',
          message: `Dr. ${req.user.name} prescribed ${name}`,
          type: 'medication'
        });
      }

      return res.status(201).json(med);
    }

    // Patient role
    const med = await Medication.create({
      patient: req.user._id,
      name,
      dosage,
      time,
      frequency,
      instructions,
      source: 'patient',
      active: true
    });
    res.status(201).json(med);
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
});

// POST /api/medications/send
// Doctor prescribes medication to an assigned / registered patient
router.post('/send', protect, roles('doctor', 'admin'), async (req, res) => {
  try {
    const { patientId, name, dosage, time, frequency, instructions } = req.body;
    if (!patientId || !name) {
      return res.status(400).json({ message: 'Patient and medication name are required' });
    }

    const patient = await User.findOne({ _id: patientId, role: 'patient' }).select('_id name email');
    if (!patient) return res.status(404).json({ message: 'Patient not found' });

    const med = await Medication.create({
      patient: patientId,
      name,
      dosage,
      time,
      frequency,
      instructions,
      active: true,
      source: 'doctor',
      prescribedBy: req.user._id
    });

    await Notification.create({
      user: patientId,
      title: 'New medication from your doctor',
      message: `Dr. ${req.user.name} prescribed ${name}${dosage ? ` (${dosage})` : ''}${time ? ` at ${time}` : ''}.`,
      type: 'medication'
    });

    const io = req.app.get('io');
    if (io) {
      io.to(`user:${patientId}`).emit('notification:new', {
        title: 'New medication from your doctor',
        message: `Dr. ${req.user.name} prescribed ${name}`,
        type: 'medication'
      });
    }

    res.status(201).json(med);
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
});

// PATCH /api/medications/:id/take
// Patient marks that they have taken their scheduled dose today
router.patch('/:id/take', protect, roles('patient'), async (req, res) => {
  try {
    const med = await Medication.findOne({ _id: req.params.id, patient: req.user._id });
    if (!med) return res.status(404).json({ message: 'Medication not found' });

    const now = new Date();
    med.lastTakenAt = now;
    if (!med.takenDates) med.takenDates = [];
    med.takenDates.push(now);
    await med.save();

    res.json({ message: 'Medication marked as taken', medication: med });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// PUT /api/medications/:id
// Update medication status (active/paused) or details
router.put('/:id', protect, async (req, res) => {
  try {
    let med;
    if (req.user.role === 'patient') {
      med = await Medication.findOne({ _id: req.params.id, patient: req.user._id });
    } else if (req.user.role === 'doctor') {
      med = await Medication.findOne({ _id: req.params.id, prescribedBy: req.user._id });
      if (!med) {
        // Allow doctor to manage if it belongs to any patient in the system
        med = await Medication.findById(req.params.id);
      }
    } else if (req.user.role === 'admin') {
      med = await Medication.findById(req.params.id);
    }

    if (!med) return res.status(404).json({ message: 'Medication not found or unauthorized' });

    Object.assign(med, req.body);
    await med.save();
    res.json(med);
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
});

// DELETE /api/medications/:id
// Delete a medication
router.delete('/:id', protect, async (req, res) => {
  try {
    let med;
    if (req.user.role === 'patient') {
      med = await Medication.findOne({ _id: req.params.id, patient: req.user._id });
    } else if (req.user.role === 'doctor') {
      med = await Medication.findOne({ _id: req.params.id, prescribedBy: req.user._id });
      if (!med) {
        med = await Medication.findById(req.params.id);
      }
    } else if (req.user.role === 'admin') {
      med = await Medication.findById(req.params.id);
    }

    if (!med) return res.status(404).json({ message: 'Medication not found or unauthorized' });

    await med.deleteOne();
    res.json({ message: 'Medication removed successfully' });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

export default router;
