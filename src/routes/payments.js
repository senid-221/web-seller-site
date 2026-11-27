import {Router} from "express";
import {prisma} from "../db.js";
import {config} from "../config.js";
import {validFlutterwaveHash,validStripeSignature,confirmPayment} from "../services/payments.js";
const router=Router();
router.post("/webhooks/flutterwave",async(req,res)=>{
 if(!validFlutterwaveHash(req.headers["verif-hash"]))return res.status(401).json({error:"Invalid webhook signature"});
 const event=req.body?.data,transactionId=event?.id,reference=event?.tx_ref;
 if(!transactionId||!reference)return res.status(400).json({error:"Invalid webhook event"});
 const payment=await prisma.payment.findUnique({where:{id:reference}});
 if(!payment)return res.json({received:true});
 const verify=await fetch("https://api.flutterwave.com/v3/transactions/"+encodeURIComponent(transactionId)+"/verify",{headers:{Authorization:"Bearer "+config.FLUTTERWAVE_SECRET_KEY}});
 const result=await verify.json().catch(()=>({}));
 if(verify.ok&&result.data?.status==="successful"&&result.data.tx_ref===payment.id&&result.data.currency===payment.currency&&Number(result.data.amount)>=payment.amount){
  await confirmPayment(payment.id,String(transactionId));
 }
 res.json({received:true});
});
router.post("/webhooks/stripe",async(req,res)=>{
 if(!validStripeSignature(req.body,req.headers["stripe-signature"]))return res.status(401).json({error:"Invalid webhook signature"});
 let event;try{event=JSON.parse(req.body.toString("utf8"));}catch{return res.status(400).end();}
 if(event.type==="checkout.session.completed"){
  const session=event.data.object,paymentId=session.metadata?.paymentId;
  const payment=paymentId?await prisma.payment.findUnique({where:{id:paymentId}}):null;
  if(payment&&session.payment_status==="paid"&&session.currency?.toUpperCase()===payment.currency&&Number(session.amount_total)===payment.amount)await confirmPayment(payment.id,session.id);
 }
 res.json({received:true});
});
router.get("/mtn/:paymentId/status",async(req,res)=>{
 const payment=await prisma.payment.findUnique({where:{id:req.params.paymentId}});
 if(!payment||payment.provider!=="MTN_MOMO")return res.status(404).json({error:"MTN payment not found"});
 const base=config.MTN_MOMO_BASE_URL,key=config.MTN_MOMO_SUBSCRIPTION_KEY;
 const auth=await fetch(base+"/collection/token/",{headers:{Authorization:"Basic "+Buffer.from(config.MTN_MOMO_API_USER+":"+config.MTN_MOMO_API_KEY).toString("base64"),"Ocp-Apim-Subscription-Key":key}});
 const token=await auth.json();
 const r=await fetch(base+"/collection/v1_0/requesttopay/"+encodeURIComponent(payment.providerReference),{headers:{Authorization:"Bearer "+token.access_token,"X-Target-Environment":config.MTN_MOMO_TARGET_ENVIRONMENT,"Ocp-Apim-Subscription-Key":key}});
 const data=await r.json().catch(()=>({}));
 if(r.ok&&data.status==="SUCCESSFUL"&&Number(data.amount)===payment.amount&&data.currency===payment.currency&&data.externalId===payment.id)await confirmPayment(payment.id,payment.providerReference);
 if(data.status==="FAILED"||data.status==="REJECTED")await prisma.payment.update({where:{id:payment.id},data:{status:"FAILED"}});
 const latest=await prisma.payment.findUnique({where:{id:payment.id},include:{order:{select:{status:true}}}});
 res.json({status:latest.status,orderStatus:latest.order.status});
});
router.get("/return",(req,res)=>res.redirect(config.STOREFRONT_URL+"/?payment=return"));
export default router;
