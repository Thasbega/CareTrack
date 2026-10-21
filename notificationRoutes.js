import {Router} from 'express';
import Notification from '../models/Notification.js';
import {protect} from '../middleware/auth.js';
const router=Router();

router.get('/',protect,async(req,res)=>{
  res.json(await Notification.find({user:req.user._id}).sort({createdAt:-1}).limit(100));
});

router.get('/unread-count',protect,async(req,res)=>{
  res.json({count:await Notification.countDocuments({user:req.user._id,read:false})});
});

router.patch('/:id/read',protect,async(req,res)=>{
  const note=await Notification.findOne({_id:req.params.id,user:req.user._id});
  if(!note)return res.status(404).json({message:'Notification not found'});
  note.read=true;
  await note.save();
  res.json(note);
});

router.patch('/read-all',protect,async(req,res)=>{
  await Notification.updateMany({user:req.user._id,read:false},{read:true});
  res.json({message:'All notifications marked as read'});
});

router.delete('/:id',protect,async(req,res)=>{
  const note=await Notification.findOne({_id:req.params.id,user:req.user._id});
  if(!note)return res.status(404).json({message:'Notification not found'});
  await note.deleteOne();
  res.json({message:'Deleted'});
});

export default router;
