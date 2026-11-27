import {Router} from "express";
import crypto from "node:crypto";
import {z} from "zod";
import {prisma} from "../db.js";
import {requireOwner} from "../middleware/auth.js";
import {startProviderCheckout} from "../services/payments.js";
const router=Router();
router.post("/checkout",async(req,res)=>{
 const p=z.object({email:z.string().email().transform(v=>v.toLowerCase()),name:z.string().trim().max(120).optional(),phone:z.string().trim().max(30).optional(),provider:z.enum(["FLUTTERWAVE","STRIPE","MTN_MOMO"]),items:z.array(z.object({productId:z.string().min(1),quantity:z.number().int().min(1).max(10)})).min(1).max(25)}).safeParse(req.body);
 if(!p.success)return res.status(400).json({error:"Check your checkout details",details:p.error.flatten()});
 const ids=[...new Set(p.data.items.map(i=>i.productId))];
 if(ids.length!==p.data.items.length)return res.status(400).json({error:"Duplicate cart items are not allowed"});
 const products=await prisma.product.findMany({where:{id:{in:ids},status:"ACTIVE"}});
 if(products.length!==ids.length)return res.status(400).json({error:"A product is no longer available"});
 const byId=new Map(products.map(x=>[x.id,x]));
 const total=p.data.items.reduce((sum,i)=>sum+byId.get(i.productId).price*i.quantity,0);
 if(!Number.isSafeInteger(total)||total<=0)return res.status(400).json({error:"Invalid order total"});
 const currency=products[0].currency;
 if(products.some(x=>x.currency!==currency))return res.status(400).json({error:"Cart products must use the same currency"});
 const orderNumber="WS-"+Date.now().toString(36).toUpperCase()+"-"+crypto.randomBytes(3).toString("hex").toUpperCase();
 const order=await prisma.order.create({data:{orderNumber,customerEmail:p.data.email,customerName:p.data.name,customerPhone:p.data.phone,currency,subtotal:total,total,items:{create:p.data.items.map(i=>({productId:i.productId,productName:byId.get(i.productId).name,unitPrice:byId.get(i.productId).price,quantity:i.quantity}))}}});
 const payment=await prisma.payment.create({data:{orderId:order.id,provider:p.data.provider,amount:total,currency}});
 try{
  const started=await startProviderCheckout({payment,order,customer:p.data});
  await prisma.payment.update({where:{id:payment.id},data:{providerReference:started.reference,checkoutUrl:started.url}});
  res.status(201).json({order:{orderNumber,total,currency,status:"PENDING"},payment:{id:payment.id,provider:p.data.provider,reference:started.reference,checkoutUrl:started.url,status:"PENDING"},message:started.message});
 }catch(e){await prisma.payment.update({where:{id:payment.id},data:{status:"FAILED"}});await prisma.order.update({where:{id:order.id},data:{status:"FAILED"}});throw e;}
});
router.get("/admin/all",requireOwner,async(_req,res)=>{const orders=await prisma.order.findMany({include:{items:true,payments:{select:{provider:true,status:true,createdAt:true}}},orderBy:{createdAt:"desc"},take:200});res.json({orders});});
router.get("/:orderNumber",async(req,res)=>{
 const order=await prisma.order.findUnique({where:{orderNumber:req.params.orderNumber},include:{items:{select:{productName:true,quantity:true,unitPrice:true}},payments:{select:{provider:true,status:true,createdAt:true}}}});
 if(!order)return res.status(404).json({error:"Order not found"});
 res.json({order:{orderNumber:order.orderNumber,status:order.status,total:order.total,currency:order.currency,createdAt:order.createdAt,items:order.items,payments:order.payments}});
});
export default router;
