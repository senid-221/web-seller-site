import crypto from "node:crypto";
import {config} from "../config.js";
async function requestJson(url,options={}){
 const r=await fetch(url,options);const data=await r.json().catch(()=>({}));
 if(!r.ok)throw new Error(data.message||data.error||"Payment provider request failed");
 return data;
}
export async function startProviderCheckout({payment,order,customer}){
 const amount=payment.amount,currency=payment.currency;
 if(payment.provider==="FLUTTERWAVE"){
  if(!config.FLUTTERWAVE_SECRET_KEY)throw new Error("Flutterwave credentials are not configured");
  const d=await requestJson("https://api.flutterwave.com/v3/payments",{method:"POST",headers:{Authorization:"Bearer "+config.FLUTTERWAVE_SECRET_KEY,"Content-Type":"application/json"},body:JSON.stringify({tx_ref:payment.id,amount,currency,redirect_url:config.APP_URL+"/api/payments/return",customer:{email:customer.email,name:customer.name||"Customer",phonenumber:customer.phone},customizations:{title:"Web Seller Site",description:"Order "+order.orderNumber},meta:{orderId:order.id}})});
  if(!d.data?.link)throw new Error("Flutterwave did not return a checkout link");
  return {url:d.data.link,reference:payment.id,message:"Complete payment on Flutterwave's secure checkout page."};
 }
 if(payment.provider==="STRIPE"){
  if(!config.STRIPE_SECRET_KEY)throw new Error("Stripe credentials are not configured");
  // RWF is a zero-decimal currency; do not multiply its amount by 100.
  const form=new URLSearchParams({mode:"payment",success_url:config.STOREFRONT_URL+"/?payment=return&order="+order.orderNumber,cancel_url:config.STOREFRONT_URL+"/?payment=cancelled&order="+order.orderNumber,customer_email:customer.email,"line_items[0][price_data][currency]":currency.toLowerCase(),"line_items[0][price_data][product_data][name]":"Order "+order.orderNumber,"line_items[0][price_data][unit_amount]":String(amount),"line_items[0][quantity]":"1","metadata[paymentId]":payment.id,"metadata[orderId]":order.id});
  const d=await requestJson("https://api.stripe.com/v1/checkout/sessions",{method:"POST",headers:{Authorization:"Bearer "+config.STRIPE_SECRET_KEY,"Content-Type":"application/x-www-form-urlencoded"},body:form});
  if(!d.url)throw new Error("Stripe did not return a checkout URL");
  return {url:d.url,reference:d.id,message:"Complete payment on Stripe's secure checkout page."};
 }
 if(payment.provider==="MTN_MOMO"){
  const {MTN_MOMO_BASE_URL:base,MTN_MOMO_SUBSCRIPTION_KEY:key,MTN_MOMO_API_USER:user,MTN_MOMO_API_KEY:secret,MTN_MOMO_TARGET_ENVIRONMENT:target}=config;
  if(!key||!user||!secret)throw new Error("MTN MoMo credentials are not configured");
  const digits=String(customer.phone||"").replace(/\D/g,"");
  if(!/^(250)?7\d{8}$/.test(digits))throw new Error("Enter a valid Rwanda mobile number for MTN MoMo");
  const payer=digits.startsWith("250")?digits:"250"+digits;
  const auth=await requestJson(base+"/collection/token/",{headers:{Authorization:"Basic "+Buffer.from(user+":"+secret).toString("base64"),"Ocp-Apim-Subscription-Key":key}});
  const reference=crypto.randomUUID();
  const r=await fetch(base+"/collection/v1_0/requesttopay",{method:"POST",headers:{Authorization:"Bearer "+auth.access_token,"X-Reference-Id":reference,"X-Target-Environment":target,"Ocp-Apim-Subscription-Key":key,"Content-Type":"application/json"},body:JSON.stringify({amount:String(amount),currency,payer:{partyIdType:"MSISDN",partyId:payer},externalId:payment.id,payerMessage:"Web Seller Site order "+order.orderNumber,payeeNote:"Digital product purchase"})});
  if(r.status!==202)throw new Error("MTN MoMo could not start the payment request");
  return {url:null,reference,message:"Approve the payment request on your MTN phone. The order stays pending until MTN confirms it."};
 }
 throw new Error("Unsupported payment provider");
}
export function validFlutterwaveHash(value){const expected=config.FLUTTERWAVE_WEBHOOK_HASH||"";if(!expected||!value)return false;const a=Buffer.from(expected),b=Buffer.from(String(value));return a.length===b.length&&crypto.timingSafeEqual(a,b);}
export function validStripeSignature(raw,header){
 if(!config.STRIPE_WEBHOOK_SECRET||!header)return false;
 const parts=Object.fromEntries(String(header).split(",").map(x=>x.split("=",2)));
 if(!parts.t||!parts.v1)return false;
 const expected=crypto.createHmac("sha256",config.STRIPE_WEBHOOK_SECRET).update(parts.t+".").update(raw).digest("hex");
 const a=Buffer.from(expected),b=Buffer.from(parts.v1);
 return a.length===b.length&&crypto.timingSafeEqual(a,b)&&Math.abs(Date.now()/1000-Number(parts.t))<300;
}
export async function confirmPayment(paymentId,providerReference){
 return prismaConfirm(paymentId,providerReference);
}
import {prisma} from "../db.js";
async function prismaConfirm(paymentId,providerReference){
 return prisma.$transaction(async tx=>{
  const payment=await tx.payment.findUnique({where:{id:paymentId}});
  if(!payment||payment.status==="SUCCEEDED")return false;
  await tx.payment.update({where:{id:paymentId},data:{status:"SUCCEEDED",providerReference:providerReference||payment.providerReference}});
  await tx.order.update({where:{id:payment.orderId},data:{status:"PAID"}});
  return true;
 });
}
