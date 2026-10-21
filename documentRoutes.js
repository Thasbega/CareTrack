import {Router} from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import MedicalDocument from '../models/MedicalDocument.js';
import {protect,roles} from '../middleware/auth.js';

const __dirname=path.dirname(fileURLToPath(import.meta.url));
const uploadDir=path.join(__dirname,'..','uploads');
if(!fs.existsSync(uploadDir))fs.mkdirSync(uploadDir,{recursive:true});

const storage=multer.diskStorage({
  destination:(req,file,cb)=>cb(null,uploadDir),
  filename:(req,file,cb)=>{
    const unique=`${Date.now()}-${Math.round(Math.random()*1e9)}`;
    cb(null,`${unique}${path.extname(file.originalname)}`);
  }
});
const allowed=['.pdf','.png','.jpg','.jpeg','.webp','.doc','.docx'];
const upload=multer({
  storage,
  limits:{fileSize:10*1024*1024},
  fileFilter:(req,file,cb)=>{
    if(allowed.includes(path.extname(file.originalname).toLowerCase()))cb(null,true);
    else cb(new Error('Unsupported file type'));
  }
});

const router=Router();

router.get('/',protect,async(req,res)=>{
  if(req.user.role==='patient'){
    return res.json(await MedicalDocument.find({patient:req.user._id}).populate('patient','name email').sort({createdAt:-1}));
  }
  if(!req.query.patientId) return res.json([]);
  res.json(await MedicalDocument.find({patient:req.query.patientId}).populate('patient','name email').sort({createdAt:-1}));
});

router.post('/',protect,roles('patient'),upload.single('file'),async(req,res)=>{
  try{
    if(!req.file)return res.status(400).json({message:'No file uploaded'});
    const doc=await MedicalDocument.create({
      patient:req.user._id,
      title:req.body.title||req.file.originalname,
      fileUrl:`/uploads/${req.file.filename}`,
      fileType:req.file.mimetype
    });
    res.status(201).json(doc);
  }catch(e){res.status(400).json({message:e.message});}
});

router.delete('/:id',protect,roles('patient'),async(req,res)=>{
  const doc=await MedicalDocument.findOne({_id:req.params.id,patient:req.user._id});
  if(!doc)return res.status(404).json({message:'Document not found'});
  const filePath=path.join(uploadDir,path.basename(doc.fileUrl));
  fs.unlink(filePath,()=>{});
  await doc.deleteOne();
  res.json({message:'Deleted'});
});

export default router;
