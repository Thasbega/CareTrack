import {Router} from 'express';
import Appointment from '../models/Appointment.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import {protect,roles} from '../middleware/auth.js';
const router=Router();

router.get('/',protect,async(req,res)=>{
  const q=req.user.role==='patient'?{patient:req.user._id}:req.user.role==='doctor'?{doctor:req.user._id}:{};
  res.json(await Appointment.find(q).populate('patient','name email').populate('doctor','name email specialization').sort({date:1}));
});

router.post('/',protect,roles('patient'),async(req,res)=>{
  try{
    const doctor=await User.findOne({_id:req.body.doctorId,role:'doctor'});
    if(!doctor)return res.status(404).json({message:'Doctor not found'});
    if(!req.body.date)return res.status(400).json({message:'Date is required'});
    const a=await Appointment.create({patient:req.user._id,doctor:doctor._id,date:req.body.date,reason:req.body.reason});
    await Notification.create({user:doctor._id,title:'New appointment request',message:`${req.user.name} requested an appointment on ${new Date(req.body.date).toLocaleString()}`,type:'appointment'});
    const io=req.app.get('io');
    if(io) io.to(`user:${doctor._id}`).emit('notification:new',{title:'New appointment request',message:`${req.user.name} requested an appointment`,type:'appointment'});
    res.status(201).json(a);
  }catch(e){res.status(400).json({message:e.message});}
});

router.patch('/:id/status',protect,roles('doctor','admin'),async(req,res)=>{
  try{
    const {status}=req.body;
    if(!['pending','confirmed','completed','cancelled'].includes(status))return res.status(400).json({message:'Invalid status'});
    const appt=await Appointment.findById(req.params.id);
    if(!appt)return res.status(404).json({message:'Appointment not found'});
    if(req.user.role==='doctor' && String(appt.doctor)!==String(req.user._id))return res.status(403).json({message:'Access denied'});
    appt.status=status;
    await appt.save();
    await Notification.create({user:appt.patient,title:'Appointment update',message:`Your appointment is now ${status}`,type:'appointment'});
    const io=req.app.get('io');
    if(io) io.to(`user:${appt.patient}`).emit('notification:new',{title:'Appointment update',message:`Your appointment is now ${status}`,type:'appointment'});
    res.json(appt);
  }catch(e){res.status(400).json({message:e.message});}
});

router.delete('/:id',protect,roles('patient'),async(req,res)=>{
  const appt=await Appointment.findById(req.params.id);
  if(!appt)return res.status(404).json({message:'Appointment not found'});
  if(String(appt.patient)!==String(req.user._id))return res.status(403).json({message:'Access denied'});
  appt.status='cancelled';
  await appt.save();
  res.json(appt);
});

export default router;
