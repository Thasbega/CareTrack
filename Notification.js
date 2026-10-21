import mongoose from 'mongoose';
const schema=new mongoose.Schema({
  user:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true},
  title:String,message:String,type:String,read:{type:Boolean,default:false}
},{timestamps:true});
export default mongoose.model('Notification',schema);