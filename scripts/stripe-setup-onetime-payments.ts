/**
 * Script para configurar Stripe con pagos únicos (one-time payments)
 * y generar SQL para sincronizar con Supabase
 */

import Stripe from 'stripe';
import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Cargar variables de entorno desde .env.local y .env (si existen)
dotenv.config({ path: join(__dirname, '..', '.env.local') });
dotenv.config({ path: join(__dirname, '..', '.env') });

if (!process.env.STRIPE_SECRET_KEY) {
  console.error('\u274c Falta STRIPE_SECRET_KEY en tu archivo .env o .env.local');
  process.exit(1);
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-08-27.basil',
});

type PlanConfig = {
  name: string;
  productId: string;
  amount: number;
  currency: string;
  days: number;
  description: string;
};

type PriceMapping = {
  plan: string;
  oldPriceIds: string[];
  newPriceId: string;
};

// Configuración de planes
const PLANS: PlanConfig[] = [
  {
    name: 'Plan Anual',
    productId: 'prod_TF0csWy77LohrX',
    amount: 300, // 3.00 EUR en centavos
    currency: 'EUR',
    days: 365,
    description: 'Acceso completo durante 1 año. Incluye: historial ilimitado, exportación a .xls, almacenamiento local de imágenes/vídeos. 14 días de garantía.',
  },
  {
    name: 'Plan 3 Años',
    productId: 'prod_TF0dK0PEHdvdZa',
    amount: 750, // 7.50 EUR en centavos
    currency: 'EUR',
    days: 1095,
    description: 'Acceso completo durante 3 años con ahorro. Incluye: historial ilimitado, exportación a .xls, almacenamiento local de imágenes/vídeos. 14 días de garantía.',
  },
  {
    name: 'Plan Para Siempre',
    productId: 'prod_TF0dCIDs0jX1QP',
    amount: 2790, // 27.90 EUR en centavos
    currency: 'EUR',
    days: 100000,
    description: 'Acceso de por vida sin renovaciones. Pago único. Incluye: historial ilimitado, exportación a .xls, almacenamiento local de imágenes/vídeos. 14 días de garantía.',
  },
];

async function main() {
  console.log('🚀 Configurando Stripe para pagos únicos...\n');

  const sqlStatements: string[] = [];
  const priceMapping: PriceMapping[] = [];

  for (const plan of PLANS) {
    console.log(`\n📦 Procesando: ${plan.name}`);

    // 1. Recuperar o crear producto
    let product: Stripe.Product | null = null;
    try {
      product = await stripe.products.retrieve(plan.productId);
    } catch (err: any) {
      const status = err?.raw?.statusCode ?? err?.statusCode;
      if (status === 404) {
        product = await stripe.products.create({
          id: plan.productId,
          name: plan.name,
          description: plan.description,
        });
        console.log(`   ✅ Producto creado: ${product.id}`);
      } else {
        console.error(`   ❌ Error obteniendo producto: ${err?.message ?? err}`);
        continue;
      }
    }

    // 2. Asegurar metadatos principales
    try {
      await stripe.products.update(product.id, {
        name: plan.name,
        description: plan.description,
      });
      console.log(`   ✅ Producto sincronizado (${product.id})`);
    } catch (err: any) {
      console.error(`   ❌ Error actualizando producto: ${err?.message ?? err}`);
    }

    // 2. Listar precios existentes
    const existingPrices = await stripe.prices.list({
      product: plan.productId,
      active: true,
    });

    // 3. Buscar si ya existe un precio one-time activo con el monto correcto
    const existingOneTime = existingPrices.data.find(
      (p) => p.type === 'one_time' && p.unit_amount === plan.amount && p.currency === plan.currency.toLowerCase()
    );

    let newPriceId: string;

    if (existingOneTime) {
      console.log(`   ℹ️  Ya existe precio one-time: ${existingOneTime.id}`);
      newPriceId = existingOneTime.id;
    } else {
      // 4. Crear nuevo precio one-time
      const newPrice = await stripe.prices.create({
        product: plan.productId,
        unit_amount: plan.amount,
        currency: plan.currency.toLowerCase(),
        billing_scheme: 'per_unit',
      });

      console.log(`   ✅ Nuevo precio one-time creado: ${newPrice.id}`);
      newPriceId = newPrice.id;
    }

    // 4b. Actualizar default_price del producto si es necesario
    const currentDefault = typeof product.default_price === 'string' ? product.default_price : product.default_price?.id;
    if (currentDefault !== newPriceId) {
      try {
        await stripe.products.update(product.id, { default_price: newPriceId });
        console.log(`   🔁 Default price actualizado → ${newPriceId}`);
      } catch (err: any) {
        console.log(`   ⚠️  No se pudo actualizar default_price: ${err?.message ?? err}`);
      }
    }

    // 5. Archivar otros precios (recurring o one-time antiguos)
    const oldPriceIds = existingPrices.data
      .map((p) => p.id)
      .filter((id) => id !== newPriceId);

    for (const oldPriceId of oldPriceIds) {
      try {
        await stripe.prices.update(oldPriceId, { active: false });
        console.log(`   🗄️  Precio archivado: ${oldPriceId}`);
      } catch (err: any) {
        console.log(`   ⚠️  No se pudo archivar ${oldPriceId}: ${err?.message ?? err}`);
      }
    }

    // 6. Guardar mapeo para SQL
    priceMapping.push({
      plan: plan.name,
      oldPriceIds,
      newPriceId,
    });
  }

  // 7. Generar SQL para Supabase
  console.log('\n\n📝 SQL para actualizar Supabase:\n');
  console.log('```sql');

  for (const mapping of priceMapping) {
    if (mapping.oldPriceIds.length) {
      for (const oldPriceId of mapping.oldPriceIds) {
        const sql = `-- Actualizar ${mapping.plan}
UPDATE subscription_plans 
SET stripe_price_id = '${mapping.newPriceId}'
WHERE stripe_price_id = '${oldPriceId}';`;
        console.log(sql);
        sqlStatements.push(sql);
      }
    } else {
      console.log(`-- ${mapping.plan}: stripe_price_id = '${mapping.newPriceId}' (sin cambios necesarios)`);
    }
  }

  console.log('\n-- Verificar que todos los planes estén correctos:');
  console.log(`SELECT id, name, days, amount_cents/100.0 as euros, stripe_price_id 
FROM subscription_plans 
WHERE active = true AND free = false;`);
  console.log('```\n');

  // 7b. Intentar sincronizar con Supabase automáticamente si hay credenciales
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (supabaseUrl && supabaseServiceKey) {
    console.log('🤝 Intentando sincronizar subscription_plans en Supabase...');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    for (const mapping of priceMapping) {
      if (!mapping.oldPriceIds.length) {
        console.log(`   • ${mapping.plan}: sin cambios necesarios`);
        continue;
      }

      let totalUpdated = 0;
      let lastError: any = null;

      for (const oldPriceId of mapping.oldPriceIds) {
        const { data, error } = await supabase
          .from('subscription_plans')
          .update({ stripe_price_id: mapping.newPriceId })
          .eq('stripe_price_id', oldPriceId)
          .select('id');

        if (error) {
          lastError = error;
        } else {
          totalUpdated += data?.length ?? 0;
        }
      }

      if (!totalUpdated) {
        const { data, error } = await supabase
          .from('subscription_plans')
          .update({ stripe_price_id: mapping.newPriceId })
          .eq('name', mapping.plan)
          .select('id');

        if (error || !(data?.length)) {
          console.error(`   ❌ Supabase (${mapping.plan}) -> ${error?.message ?? lastError?.message ?? 'sin filas actualizadas'}`);
          sqlStatements.push(`-- ERROR Supabase (${mapping.plan}): ${error?.message ?? lastError?.message ?? 'sin filas actualizadas'}`);
          continue;
        }
        totalUpdated += data.length;
      }

      if (totalUpdated) {
        console.log(`   ✅ Supabase actualizado (${mapping.plan}) [${totalUpdated} filas]`);
      }
    }
  } else {
    console.log('⚠️  Supabase no se actualizó automáticamente (faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY).');
  }

  // 8. Resumen
  console.log('\n✅ Configuración completada!\n');
  console.log('📋 Resumen de Price IDs actualizados:');
  for (const mapping of priceMapping) {
    console.log(`   ${mapping.plan}: ${mapping.newPriceId}`);
  }

  console.log('\n⚠️  IMPORTANTE:');
  console.log('   1. Ejecuta el SQL generado arriba en Supabase SQL Editor');
  console.log('   2. Verifica que los precios en Stripe Dashboard sean "One-time"');
  console.log('   3. Prueba el flujo completo en test mode antes de ir a producción\n');
}

main().catch((err) => {
  console.error('❌ Error:', err);
  process.exit(1);
});
