import mongoose from 'mongoose';
const userSchema=new mongoose.Schema({
  name:{type:String,required:true,trim:true},
  email:{type:String,required:true,unique:true,lowercase:true},
  password:{type:String,required:true},
  role:{type:String,enum:['patient','doctor','admin'],default:'patient'},
  phone:String, gender:String, bloodGroup:String, dateOfBirth:Date,
  specialization:String,
  emergencyContact:{name:String,phone:String,relationship:String},
  isActive:{type:Boolean,default:true}
},{timestamps:true});
export default mongoose.model('User',userSchema);
