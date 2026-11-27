import {Router} from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import {z} from "zod";
import {prisma} from "../db.js";
import {config} from "../config.js";
import {requireOwner} from "../middleware/auth.js";
const router=Router();
router.post("/login",async(req,res)=>{
 const p=z.object({email:z.string().email().transform(v=>v.toLowerCase()),password:z.string().min(1).max(200)}).safeParse(req.body);
 if(!p.success)return res.status(400).json({error:"Enter a valid email and password"});
 const user=await prisma.user.findUnique({where:{email:p.data.email}});
 if(!user||!user.isActive||user.role!=="OWNER"||!(await bcrypt.compare(p.data.password,user.passwordHash)))return res.status(401).json({error:"Invalid email or password"});
 const token=jwt.sign({sub:user.id,role:user.role,email:user.email},config.JWT_SECRET,{expiresIn:config.JWT_EXPIRES_IN,algorithm:"HS256"});
 res.json({token,user:{id:user.id,email:user.email,name:user.name,role:user.role}});
});
router.get("/me",requireOwner,async(req,res)=>{const user=await prisma.user.findUnique({where:{id:req.user.sub},select:{id:true,email:true,name:true,role:true,isActive:true}});if(!user?.isActive)return res.status(401).json({error:"Account disabled"});res.json({user});});
export default router;
