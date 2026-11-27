import "dotenv/config";
import { z } from "zod";
const schema=z.object({
 NODE_ENV:z.enum(["development","test","production"]).default("development"),
 PORT:z.coerce.number().int().positive().default(4000),
 APP_URL:z.string().url().default("http://localhost:4000"),
 STOREFRONT_URL:z.string().url().default("http://localhost:5500"),
 CORS_ORIGINS:z.string().default("http://localhost:5500,http://127.0.0.1:5500"),
 JWT_SECRET:z.string().min(32,"JWT_SECRET must contain at least 32 characters"),
 JWT_EXPIRES_IN:z.string().default("12h"),
 ADMIN_EMAIL:z.string().email(),
 ADMIN_PASSWORD:z.string().min(12,"ADMIN_PASSWORD must contain at least 12 characters"),
 DATABASE_URL:z.string().min(1),
 PAYMENT_CURRENCY:z.string().default("RWF"),
 FLUTTERWAVE_SECRET_KEY:z.string().optional(),
 FLUTTERWAVE_WEBHOOK_HASH:z.string().optional(),
 FLUTTERWAVE_BASE_URL:z.string().url().default("https://api.flutterwave.com/v3"),
 STRIPE_SECRET_KEY:z.string().optional(),
 STRIPE_WEBHOOK_SECRET:z.string().optional(),
 MTN_MOMO_BASE_URL:z.string().url().default("https://sandbox.momodeveloper.mtn.com"),
 MTN_MOMO_SUBSCRIPTION_KEY:z.string().optional(),
 MTN_MOMO_API_USER:z.string().optional(),
 MTN_MOMO_API_KEY:z.string().optional(),
 MTN_MOMO_TARGET_ENVIRONMENT:z.string().default("sandbox"),
 MTN_MOMO_CALLBACK_URL:z.string().url().optional()
});
const parsed=schema.safeParse(process.env);
if(!parsed.success){console.error("Invalid environment configuration:",parsed.error.flatten().fieldErrors);process.exit(1)}
export const config={...parsed.data,corsOrigins:parsed.data.CORS_ORIGINS.split(",").map(x=>x.trim()).filter(Boolean)};
