import "dotenv/config";
import bcrypt from "bcryptjs";
import {PrismaClient} from "@prisma/client";
const prisma=new PrismaClient();
try{
 const email=process.env.ADMIN_EMAIL?.toLowerCase(),password=process.env.ADMIN_PASSWORD;
 if(!email||!password||password.length<12)throw new Error("Set ADMIN_EMAIL and ADMIN_PASSWORD (12+ characters) first");
 const passwordHash=await bcrypt.hash(password,12);
 await prisma.user.upsert({where:{email},update:{passwordHash,role:"OWNER",isActive:true},create:{email,passwordHash,role:"OWNER",name:"Store Owner"}});
 console.log("Owner account configured:",email);
}finally{await prisma.$disconnect();}
