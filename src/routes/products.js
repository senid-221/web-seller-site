import {Router} from "express";
import {z} from "zod";
import {prisma} from "../db.js";
import {requireOwner} from "../middleware/auth.js";
const router=Router();
const schema=z.object({
 name:z.string().trim().min(2).max(140),slug:z.string().trim().min(2).max(150).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
 category:z.string().trim().min(2).max(80),description:z.string().trim().min(5).max(5000),
 price:z.number().int().positive().max(2000000000),currency:z.string().length(3).default("RWF"),
 previewImage:z.string().url().nullable().optional(),status:z.enum(["DRAFT","ACTIVE","ARCHIVED"]).default("DRAFT"),featured:z.boolean().default(false)
});
const publicFields={id:true,slug:true,name:true,category:true,description:true,price:true,currency:true,previewImage:true,featured:true};
router.get("/",async(req,res)=>{
 const q=String(req.query.q||"").slice(0,100),category=String(req.query.category||"").slice(0,80);
 const where={status:"ACTIVE",...(category&&category!=="All"?{category}:{}),...(q?{OR:[{name:{contains:q,mode:"insensitive"}},{description:{contains:q,mode:"insensitive"}},{category:{contains:q,mode:"insensitive"}}]}:{})};
 const products=await prisma.product.findMany({where,select:publicFields,orderBy:[{featured:"desc"},{createdAt:"desc"}],take:100});
 res.json({products});
});
router.get("/admin/all",requireOwner,async(_req,res)=>{const products=await prisma.product.findMany({orderBy:{createdAt:"desc"}});res.json({products});});
router.post("/",requireOwner,async(req,res)=>{
 const p=schema.safeParse(req.body);if(!p.success)return res.status(400).json({error:"Invalid product details",details:p.error.flatten()});
 try{const product=await prisma.product.create({data:p.data});res.status(201).json({product});}catch(e){if(e.code==="P2002")return res.status(409).json({error:"That product slug already exists"});throw e;}
});
router.patch("/:id",requireOwner,async(req,res)=>{
 const p=schema.partial().safeParse(req.body);if(!p.success)return res.status(400).json({error:"Invalid product details",details:p.error.flatten()});
 try{const product=await prisma.product.update({where:{id:req.params.id},data:p.data});res.json({product});}catch(e){if(e.code==="P2025")return res.status(404).json({error:"Product not found"});throw e;}
});
router.delete("/:id",requireOwner,async(req,res)=>{try{await prisma.product.update({where:{id:req.params.id},data:{status:"ARCHIVED"}});res.status(204).end();}catch(e){if(e.code==="P2025")return res.status(404).json({error:"Product not found"});throw e;}});
export default router;
