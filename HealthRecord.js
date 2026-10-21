import mongoose from 'mongoose';
const schema=new mongoose.Schema({
  patient:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true},
  heartRate:Number,systolic:Number,diastolic:Number,spo2:Number,
  temperature:Number,bloodSugar:Number,weight:Number,
  status:{type:String,enum:['normal','alert'],default:'normal'},
  alertReasons:[String],
  recordedAt:{type:Date,default:Date.now}
},{timestamps:true});
export default mongoose.model('HealthRecord',schema);