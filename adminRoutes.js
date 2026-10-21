import {Router} from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Appointment from '../models/Appointment.js';
import HealthRecord from '../models/HealthRecord.js';
import {protect,roles} from '../middleware/auth.js';
const router=Router();

router.use(protect,roles('admin'));

router.get('/users',async(req,res)=>{
  res.json(await User.find().select('-password').sort({createdAt:-1}));
});

router.post('/users',async(req,res)=>{
  try{
    const {name,email,password,role='patient',specialization}=req.body;
    if(!name||!email||!password)return res.status(400).json({message:'Name, email and password are required'});
    if(await User.findOne({email}))return res.status(409).json({message:'Email already registered'});
    const hash=await bcrypt.hash(password,10);
    const user=await User.create({name,email,password:hash,role,specialization});
    const {password:_,...safe}=user.toObject();
    res.status(201).json(safe);
  }catch(e){res.status(400).json({message:e.message});}
});

router.patch('/users/:id',async(req,res)=>{
  const user=await User.findById(req.params.id);
  if(!user)return res.status(404).json({message:'User not found'});
  const {role,isActive,name,phone,specialization}=req.body;
  if(role!==undefined)user.role=role;
  if(isActive!==undefined)user.isActive=isActive;
  if(name!==undefined)user.name=name;
  if(phone!==undefined)user.phone=phone;
  if(specialization!==undefined)user.specialization=specialization;
  await user.save();
  const {password:_,...safe}=user.toObject();
  res.json(safe);
});

router.delete('/users/:id',async(req,res)=>{
  if(String(req.params.id)===String(req.user._id))return res.status(400).json({message:'You cannot delete your own account'});
  const user=await User.findById(req.params.id);
  if(!user)return res.status(404).json({message:'User not found'});
  await user.deleteOne();
  res.json({message:'Deleted'});
});

router.get('/overview',async(req,res)=>{
  const [patients,doctors,admins,appointments,alerts,totalRecords]=await Promise.all([
    User.countDocuments({role:'patient'}),
    User.countDocuments({role:'doctor'}),
    User.countDocuments({role:'admin'}),
    Appointment.countDocuments(),
    HealthRecord.countDocuments({status:'alert'}),
    HealthRecord.countDocuments()
  ]);
  res.json({patients,doctors,admins,appointments,alerts,totalRecords});
});

export default router;
