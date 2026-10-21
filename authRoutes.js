import {Router} from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import {protect} from '../middleware/auth.js';
const router=Router();

const tokenFor=id=>jwt.sign({id},process.env.JWT_SECRET,{expiresIn:'7d'});

router.post('/register',async(req,res)=>{
  try{
    const {name,email,password,role='patient',specialization}=req.body;
    if(!name||!email||!password)return res.status(400).json({message:'Name, email and password are required'});
    if(password.length<6)return res.status(400).json({message:'Password must be at least 6 characters'});
    if(await User.findOne({email}))return res.status(409).json({message:'Email already registered'});
    const hash=await bcrypt.hash(password,10);
    // Admin accounts are never created through public self-registration
    const safeRole=role==='admin'?'patient':role;
    const user=await User.create({name,email,password:hash,role:safeRole,specialization:safeRole==='doctor'?specialization:undefined});
    res.status(201).json({token:tokenFor(user._id),user:{id:user._id,name:user.name,email:user.email,role:user.role}});
  }catch(e){res.status(500).json({message:e.message});}
});
router.post('/login',async(req,res)=>{
  try{
    const user=await User.findOne({email:req.body.email});
    if(!user||!(await bcrypt.compare(req.body.password,user.password)))return res.status(401).json({message:'Invalid email or password'});
    if(user.isActive===false)return res.status(403).json({message:'Account has been deactivated. Contact an administrator.'});
    res.json({token:tokenFor(user._id),user:{id:user._id,name:user.name,email:user.email,role:user.role}});
  }catch(e){res.status(500).json({message:e.message});}
});
router.get('/me',protect,(req,res)=>res.json(req.user));
export default router;
