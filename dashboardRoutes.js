import {Router} from 'express';
import User from '../models/User.js';
import Appointment from '../models/Appointment.js';
import HealthRecord from '../models/HealthRecord.js';
import {protect,roles} from '../middleware/auth.js';
const router=Router();
router.get('/stats',protect,roles('doctor','admin'),async(req,res)=>{
  const [patients,appointments,alerts]=await Promise.all([
    User.countDocuments({role:'patient'}),
    Appointment.countDocuments(req.user.role==='doctor'?{doctor:req.user._id}:{ }),
    HealthRecord.countDocuments({status:'alert'})
  ]);
  res.json({patients,appointments,alerts});
});
export default router;