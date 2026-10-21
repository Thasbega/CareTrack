import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export async function protect(req,res,next){
  try{
    const token=req.headers.authorization?.startsWith('Bearer ')
      ? req.headers.authorization.split(' ')[1] : null;
    if(!token) return res.status(401).json({message:'Authentication required'});
    const decoded=jwt.verify(token,process.env.JWT_SECRET);
    req.user=await User.findById(decoded.id).select('-password');
    if(!req.user) return res.status(401).json({message:'User not found'});
    if(req.user.isActive===false) return res.status(403).json({message:'Account has been deactivated'});
    next();
  }catch(e){return res.status(401).json({message:'Invalid or expired token'});}
}
export function roles(...allowed){return (req,res,next)=>allowed.includes(req.user.role)?next():res.status(403).json({message:'Access denied'});}

// Shared helper so REST routes and the Socket.IO layer authenticate the same way
export async function verifyToken(token){
  const decoded=jwt.verify(token,process.env.JWT_SECRET);
  const user=await User.findById(decoded.id).select('-password');
  if(!user || user.isActive===false) throw new Error('Invalid session');
  return user;
}
