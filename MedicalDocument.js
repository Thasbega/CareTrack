import mongoose from 'mongoose';
const schema=new mongoose.Schema({
  patient:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true},
  title:String,fileUrl:String,fileType:String
},{timestamps:true});
export default mongoose.model('MedicalDocument',schema);