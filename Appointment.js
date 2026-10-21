import mongoose from 'mongoose';
const schema=new mongoose.Schema({
  patient:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true},
  doctor:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true},
  date:{type:Date,required:true},
  reason:String,
  status:{type:String,enum:['pending','confirmed','completed','cancelled'],default:'pending'}
},{timestamps:true});
export default mongoose.model('Appointment',schema);