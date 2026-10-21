import {Router} from 'express';
import User from '../models/User.js';
import {protect,roles} from '../middleware/auth.js';
const router=Router();

// Doctors listing so patients can pick a doctor when booking an appointment or starting a chat
router.get('/doctors',protect,async(req,res)=>{
  const doctors=await User.find({role:'doctor',isActive:{$ne:false}}).select('-password').sort({name:1});
  res.json(doctors);
});

router.get('/',protect,roles('doctor','admin'),async(req,res)=>{
  const patients=await User.find({role:'patient'}).select('-password').sort({name:1});
  res.json(patients);
});

router.get('/:id',protect,roles('doctor','admin'),async(req,res)=>{
  const patient=await User.findOne({_id:req.params.id,role:'patient'}).select('-password');
  if(!patient)return res.status(404).json({message:'Patient not found'});
  res.json(patient);
});

export default router;
