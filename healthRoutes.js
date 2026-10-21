import {Router} from 'express';
import HealthRecord from '../models/HealthRecord.js';
import {protect,roles} from '../middleware/auth.js';
import Notification from '../models/Notification.js';

const router=Router();
function evaluate(body){
  const reasons=[];
  if(body.heartRate!==undefined && body.heartRate!=='' && (body.heartRate<50||body.heartRate>120))reasons.push('Heart rate outside configured monitoring range');
  if(body.spo2!==undefined && body.spo2!=='' && body.spo2<94)reasons.push('SpO2 below configured monitoring threshold');
  if(body.temperature!==undefined && body.temperature!=='' && (body.temperature<95||body.temperature>100.4))reasons.push('Temperature outside configured monitoring range');
  if(body.systolic!==undefined && body.systolic!=='' && (body.systolic>140||body.systolic<90))reasons.push('Systolic BP outside configured monitoring range');
  if(body.diastolic!==undefined && body.diastolic!=='' && (body.diastolic>90||body.diastolic<60))reasons.push('Diastolic BP outside configured monitoring range');
  return reasons;
}
router.get('/',protect,async(req,res)=>{
  const query=req.user.role==='patient'?{patient:req.user._id}:{};
  const rows=await HealthRecord.find(query).populate('patient','name email').sort({recordedAt:-1}).limit(200);
  res.json(rows);
});
router.post('/',protect,roles('patient'),async(req,res)=>{
  try{
    const reasons=evaluate(req.body);
    const record=await HealthRecord.create({...req.body,patient:req.user._id,status:reasons.length?'alert':'normal',alertReasons:reasons});
    if(reasons.length)await Notification.create({user:req.user._id,title:'Health monitoring alert',message:reasons.join('; '),type:'health_alert'});
    const io=req.app.get('io');
    if(io && reasons.length) io.to(`user:${req.user._id}`).emit('notification:new',{title:'Health monitoring alert',message:reasons.join('; '),type:'health_alert'});
    res.status(201).json(record);
  }catch(e){res.status(400).json({message:e.message});}
});
router.get('/summary',protect,async(req,res)=>{
  const latest=await HealthRecord.findOne({patient:req.user._id}).sort({recordedAt:-1});
  if(!latest)return res.json({});
  res.json({heartRate:latest.heartRate,bloodPressure:latest.systolic&&latest.diastolic?`${latest.systolic}/${latest.diastolic}`:null,spo2:latest.spo2,temperature:latest.temperature});
});
router.get('/patient/:patientId',protect,roles('doctor','admin'),async(req,res)=>{
  res.json(await HealthRecord.find({patient:req.params.patientId}).sort({recordedAt:-1}).limit(200));
});
router.delete('/:id',protect,async(req,res)=>{
  const record=await HealthRecord.findById(req.params.id);
  if(!record)return res.status(404).json({message:'Record not found'});
  if(req.user.role==='patient' && String(record.patient)!==String(req.user._id))return res.status(403).json({message:'Access denied'});
  await record.deleteOne();
  res.json({message:'Deleted'});
});
export default router;
