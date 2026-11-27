import crypto from "node:crypto";
import { config } from "../config.js";
const json=async(url,options)=>{const r=await fetch(url,options);const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.message||d.error||`Provider error ${r.status}`);return d};
const zero=new Set(["BIF","CLP","DJF","GNF","JPY","KMF","KRW","MGA","PYG","RWF","UGX","VND","VUV","XAF","XOF","XPF"]);
const stripeAmount=(n,c)=>zero.has(c.toUpperCase())?n:n*100;
export async function startPayment({provider,paymentId,order,customer}){
 const amount=order.total;
 if(provider==="FLUTTERWAVE"){
  if(!config.FLUTTERWAVE_SECRET_KEY)throw new Error("Flutterwave is not configured");
  const d=await json(`${config.FLUTTERWAVE_BASE_URL}/payments`,{method:"POST",headers:{Authorization:`Bearer ${config.FLUTTERWAVE_SECRET_KEY}`,"Content-Type":"application/json"},body:JSON.stringify({tx_ref:paymentId,amount,currency:order.currency,redirect_url:`${config.APP_URL}/api/payments/return`,customer:{email:customer.email,name:customer.name||"Customer"},customizations:{title:"Web Seller Site",description:`Order ${order.orderNumber}`},meta:{orderId:order.id}})});
  return{url:d.data?.link,reference:paymentId,raw:d};
 }
 if(provider==="STRIPE"){
  if(!config.STRIPE_SECRET_KEY)throw new Error("Stripe is not configured");
  const p=new URLSearchParams({mode:"payment",success_url:`${config.STOREFRONT_URL}/?payment=success&order=${order.orderNumber}`,cancel_url:`${config.STOREFRONT_URL}/?payment=cancelled&order=${order.orderNumber}`,customer_email:customer.email,"line_items[0][price_data][currency]":order.currency.toLowerCase(),"line_items[0][price_data][product_data][name]":`Web Seller Site order ${order.orderNumber}`,"line_items[0][price_data][unit_amount]":String(stripeAmount(amount,order.currency)),"line_items[0][quantity]":"1","metadata[paymentId]":paymentId,"metadata[orderId]":order.id});
  const d=await json("https://api.stripe.com/v1/checkout/sessions",{method:"POST",headers:{Authorization:`Bearer ${config.STRIPE_SECRET_KEY}`,"Content-Type":"application/x-www-form-urlencoded"},body:p});
  return{url:d.url,reference:d.id,raw:d};
 }
 if(provider==="MTN_MOMO"){
  const {MTN_MOMO_BASE_URL:b,MTN_MOMO_SUBSCRIPTION_KEY:k,MTN_MOMO_API_USER:u,MTN_MOMO_API_KEY:s,MTN_MOMO_TARGET_ENVIRONMENT:t}=config;
  if(!k||!u||!s)throw new Error("MTN MoMo is not configured");
  const token=await json(`${b}/collection/token/`,{headers:{Authorization:"Basic "+Buffer.from(`${u}:${s}`).toString("base64"),"Ocp-Apim-Subscription-Key":k}});
  const ref=crypto.randomUUID(),number=String(customer.phone||"").replace(/\D/g,"");
  if(!/^(250)?7\d{8}$/.test(number))throw new Error("A valid Rwanda mobile number is required for MTN MoMo");
  const payer=number.startsWith("250")?number:`250${number}`;
  const body={amount:String(amount),currency:order.currency,externalId:paymentId,payer:{partyIdType:"MSISDN",partyId:payer},payerMessage:`Order ${order.orderNumber}`,payeeNote:"Web Seller Site purchase"};
  await json(`${b}/collection/v1_0/requesttopay`,{method:"POST",headers:{Authorization:`Bearer ${token.access_token}`,"X-Reference-Id":ref,"X-Target-Environment":t,"Ocp-Apim-Subscription-Key":k,"Content-Type":"application/json"},body:JSON.stringify(body)});
  return{url:null,reference:ref,raw:{reference:ref,status:"PENDING"}};
 }
 throw new Error("Unsupported payment provider");
}
export function verifyFlutterwaveSignature(v){if(!config.FLUTTERWAVE_WEBHOOK_HASH||!v)return false;const a=Buffer.from(config.FLUTTERWAVE_WEBHOOK_HASH),b=Buffer.from(String(v));return a.length===b.length&&crypto.timingSafeEqual(a,b)}
export function verifyStripeSignature(body,sig){if(!config.STRIPE_WEBHOOK_SECRET||!sig)return false;const p=Object.fromEntries(sig.split(",").map(x=>x.split("=",2)));if(!p.t||!p.v1)return false;const h=crypto.createHmac("sha256",config.STRIPE_WEBHOOK_SECRET).update(`${p.t}.`).update(body).digest("hex"),a=Buffer.from(h),b=Buffer.from(p.v1);return a.length===b.length&&crypto.timingSafeEqual(a,b)&&Math.abs(Date.now()/1000-Number(p.t))<=300}
