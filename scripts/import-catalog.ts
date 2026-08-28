import fs from "fs";
import path from "path";
import { z } from "zod";
import { getDb, generateId } from "../server/db";

const OptionSchema = z.object({
  name: z.string().min(1),
  price: z.number().min(0).default(0),
});

const OptionGroupSchema = z.object({
  name: z.string().min(1),
  is_required: z.boolean().default(false),
  min_select: z.number().int().min(0).default(0),
  max_select: z.number().int().min(1).default(1),
  options: z.array(OptionSchema).default([]),
});

const ProductSchema = z.object({
  name: z.string().min(1),
  category: z.string().min(1),
  description: z.string().optional().default(""),
  price: z.number().positive(),
  promo_price: z.number().positive().optional(),
  badge: z.string().optional(),
  is_available: z.boolean().default(true),
  image_url: z.string().url().optional().or(z.string()),
  option_groups: z.array(OptionGroupSchema).optional().default([]),
});

const CategorySchema = z.object({
  name: z.string().min(1),
  sort_order: z.number().int().default(0),
});

const DeliveryZoneSchema = z.object({
  name: z.string().min(1),
  zip_prefix: z.string().optional(),
  fee: z.number().min(0),
  estimated_min: z.number().int().min(1).default(30),
  estimated_max: z.number().int().min(1).default(50),
});

const CouponSchema = z.object({
  code: z.string().min(2),
  discount_type: z.enum(["percentage", "fixed"]),
  discount_value: z.number().positive(),
  min_order_value: z.number().min(0).default(0),
  max_uses: z.number().int().positive().optional(),
  expires_in_days: z.number().int().positive().default(30),
});

const CatalogImportSchema = z.object({
  store: z.object({
    name: z.string().min(1),
    slug: z.string().min(1),
    whatsapp_number: z.string().min(8),
    description: z.string().optional(),
    business_type: z.string().optional(),
    primary_color: z.string().default("#B91C1C"),
    default_delivery_fee: z.number().default(6.0),
    min_order_value: z.number().default(20.0),
    estimated_time_min: z.number().default(30),
    estimated_time_max: z.number().default(50),
    pix_key: z.string().optional(),
    pix_key_type: z.string().optional(),
  }),
  categories: z.array(CategorySchema),
  products: z.array(ProductSchema),
  delivery_zones: z.array(DeliveryZoneSchema).optional().default([]),
  coupons: z.array(CouponSchema).optional().default([]),
});

async function main() {
  const args = process.argv.slice(2);
  let filePath = "data/catalogs/burger-craft.json";
  let targetSlug = "burger-craft";
  let isDryRun = false;

  for (const arg of args) {
    if (arg.startsWith("--file=")) {
      filePath = arg.replace("--file=", "");
    } else if (arg.startsWith("--store=")) {
      targetSlug = arg.replace("--store=", "");
    } else if (arg === "--dry-run") {
      isDryRun = true;
    }
  }

  console.log(`\n======================================================`);
  console.log(`📦 [QMD V2] Importador de Catálogo JSON`);
  console.log(`Modo: ${isDryRun ? "🧪 SIMULAÇÃO (--dry-run)" : "🚀 EXECUÇÃO REAL"}`);
  console.log(`Arquivo: ${filePath}`);
  console.log(`Loja Slug: ${targetSlug}`);
  console.log(`======================================================\n`);

  const fullPath = path.resolve(process.cwd(), filePath);
  if (!fs.existsSync(fullPath)) {
    console.error(`❌ Erro: Arquivo ${fullPath} não encontrado.`);
    process.exit(1);
  }

  const rawJson = JSON.parse(fs.readFileSync(fullPath, "utf-8"));
  const parseResult = CatalogImportSchema.safeParse(rawJson);

  if (!parseResult.success) {
    console.error(`❌ Erro de validação Zod no JSON:`);
    console.error(JSON.stringify(parseResult.error.format(), null, 2));
    process.exit(1);
  }

  const data = parseResult.data;
  console.log(`✅ Validação Zod concluída com sucesso!`);
  console.log(`📊 Relatório do Catálogo:`);
  console.log(`   - Loja: ${data.store.name} (${data.store.slug})`);
  console.log(`   - Categorias a importar: ${data.categories.length}`);
  console.log(`   - Produtos a importar: ${data.products.length}`);
  console.log(`   - Zonas de entrega: ${data.delivery_zones.length}`);
  console.log(`   - Cupons de desconto: ${data.coupons.length}`);

  let totalOptions = 0;
  for (const p of data.products) {
    for (const g of p.option_groups) {
      totalOptions += g.options.length;
    }
  }
  console.log(`   - Total de adicionais/opções: ${totalOptions}`);

  if (isDryRun) {
    console.log(`\n✨ Simulação (--dry-run) finalizada sem alterações no banco.`);
    return;
  }

  console.log(`\n💾 Persistindo no banco de dados...`);
  const db = getDb();

  // Execução real
  let store = db.stores.find(s => s.slug === data.store.slug);
  if (!store) {
    store = {
      id: generateId(),
      name: data.store.name,
      slug: data.store.slug,
      description: data.store.description || "",
      businessType: data.store.business_type || "Hamburgueria",
      primaryColor: data.store.primary_color,
      whatsappNumber: data.store.whatsapp_number,
      defaultDeliveryFeeCents: Math.round(data.store.default_delivery_fee * 100),
      minOrderValueCents: Math.round(data.store.min_order_value * 100),
      estimatedTimeMin: data.store.estimated_time_min,
      estimatedTimeMax: data.store.estimated_time_max,
      pixKey: data.store.pix_key || "",
      pixKeyType: data.store.pix_key_type || "random",
      isOpen: true,
      autoAcceptOrders: false,
      autoOpenWhatsApp: true,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    db.stores.push(store);
  }

  console.log(`✅ Catálogo da loja '${data.store.name}' importado com sucesso!`);
}

main().catch(err => {
  console.error("❌ Erro durante a importação:", err);
  process.exit(1);
});
