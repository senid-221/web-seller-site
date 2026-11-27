import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { requireAuth, requireOwner } from "../middleware/auth.js";

const router = Router();
const productInput = z.object({
  name: z.string().trim().min(2).max(140),
  slug: z.string().trim().min(2).max(160).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  category: z.string().trim().min(2).max(80),
  description: z.string().trim().min(10).max(5000),
  price: z.number().int().positive(),
  currency: z.string().length(3).default("RWF"),
  previewImage: z.string().url().optional().or(z.literal("")),
  downloadKey: z.string().max(500).optional(),
  status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]).default("DRAFT"),
  featured: z.boolean().default(false)
});
const publicSelect = { id: true, slug: true, name: true, category: true, description: true, price: true, currency: true, previewImage: true, featured: true, createdAt: true };

router.get("/", async (req, res) => {
  const where = { status: "ACTIVE" };
  if (req.query.category) where.category = String(req.query.category).slice(0, 80);
  if (req.query.q) where.OR = [{ name: { contains: String(req.query.q).slice(0, 100), mode: "insensitive" } }, { description: { contains: String(req.query.q).slice(0, 100), mode: "insensitive" } }];
  const products = await prisma.product.findMany({ where, select: publicSelect, orderBy: [{ featured: "desc" }, { createdAt: "desc" }], take: 100 });
  res.json({ products });
});
router.get("/admin/all", requireAuth, requireOwner, async (_req, res) => {
  const products = await prisma.product.findMany({ orderBy: { createdAt: "desc" } });
  res.json({ products });
});
router.post("/", requireAuth, requireOwner, async (req, res) => {
  const parsed = productInput.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid product", details: parsed.error.flatten() });
  try { const product = await prisma.product.create({ data: parsed.data }); res.status(201).json({ product }); }
  catch (e) { if (e.code === "P2002") return res.status(409).json({ error: "Product slug already exists" }); throw e; }
});
router.patch("/:id", requireAuth, requireOwner, async (req, res) => {
  const parsed = productInput.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid product", details: parsed.error.flatten() });
  const product = await prisma.product.update({ where: { id: req.params.id }, data: parsed.data });
  res.json({ product });
});
router.delete("/:id", requireAuth, requireOwner, async (req, res) => {
  await prisma.product.update({ where: { id: req.params.id }, data: { status: "ARCHIVED" } });
  res.status(204).end();
});
export default router;
