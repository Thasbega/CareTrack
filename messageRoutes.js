import {Router} from 'express';
import mongoose from 'mongoose';
import Message from '../models/Message.js';
import Appointment from '../models/Appointment.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import {protect} from '../middleware/auth.js';
const router=Router();

// People the current user is allowed to chat with: anyone they share an appointment
// with, plus anyone they've already exchanged messages with.
router.get('/contacts',protect,async(req,res)=>{
  const me=req.user._id;
  const apptField=req.user.role==='doctor'?'patient':'doctor';
  const apptIds=await Appointment.find(req.user.role==='doctor'?{doctor:me}:req.user.role==='patient'?{patient:me}:{}).distinct(apptField);
  const msgPartnersSent=await Message.find({sender:me}).distinct('receiver');
  const msgPartnersRecv=await Message.find({receiver:me}).distinct('sender');
  const ids=[...new Set([...apptIds,...msgPartnersSent,...msgPartnersRecv].map(String))];
  const contacts=await User.find({_id:{$in:ids}}).select('name email role specialization');
  res.json(contacts);
});

router.get('/unread-count',protect,async(req,res)=>{
  res.json({count:await Message.countDocuments({receiver:req.user._id,read:false})});
});

router.get('/:userId',protect,async(req,res)=>{
  const {userId}=req.params;
  if(!mongoose.isValidObjectId(userId))return res.status(400).json({message:'Invalid user id'});
  const me=req.user._id;
  const messages=await Message.find({
    $or:[{sender:me,receiver:userId},{sender:userId,receiver:me}]
  }).sort({createdAt:1});
  await Message.updateMany({sender:userId,receiver:me,read:false},{read:true});
  res.json(messages);
});

router.post('/',protect,async(req,res)=>{
  try{
    const {receiverId,text}=req.body;
    if(!receiverId||!text?.trim())return res.status(400).json({message:'Receiver and message text are required'});
    const receiver=await User.findById(receiverId);
    if(!receiver)return res.status(404).json({message:'Recipient not found'});
    const message=await Message.create({sender:req.user._id,receiver:receiverId,text:text.trim()});
    const populated=await message.populate('sender','name role');
    const io=req.app.get('io');
    if(io) io.to(`user:${receiverId}`).emit('message:new',populated);
    await Notification.create({user:receiverId,title:'New message',message:`${req.user.name} sent you a message`,type:'message'});
    if(io) io.to(`user:${receiverId}`).emit('notification:new',{title:'New message',message:`${req.user.name} sent you a message`,type:'message'});
    res.status(201).json(populated);
  }catch(e){res.status(400).json({message:e.message});}
});

export default router;
