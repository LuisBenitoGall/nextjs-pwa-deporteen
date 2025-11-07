#!/usr/bin/env tsx
/**
 * Script para crear precios recurrentes en Stripe y actualizar productos con descripciones
 * 
 * Uso:
 *   STRIPE_SECRET_KEY=sk_test_xxx node --import tsx scripts/stripe-create-recurring-prices.ts
 * 
 * O con dotenv:
 *   node -r dotenv/config --import tsx scripts/stripe-create-recurring-prices.ts
 */

import Stripe from 'stripe';
import * as fs from 'fs';
import * as path from 'path';

// Cargar .env.local si existe
const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      const value = valueParts.join('=').trim();
      if (!process.env[key.trim()]) {
        process.env[key.trim()] = value;
      }
    }
  });
}

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

if (!STRIPE_SECRET_KEY) {
  console.error('❌ Error: STRIPE_SECRET_KEY no está configurada');
  console.error('   Opciones:');
  console.error('   1. Agregar STRIPE_SECRET_KEY a .env.local');
  console.error('   2. Ejecutar: STRIPE_SECRET_KEY=sk_test_xxx node --import tsx scripts/stripe-create-recurring-prices.ts');
  process.exit(1);
}

const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: '2025-08-27.basil',
});

const PRODUCTS_CONFIG = [
  {
    id: 'prod_TF0csWy77LohrX',
    name: 'Plan Anual',
    description: 'Acceso completo durante 1 año. Incluye: historial ilimitado, exportación a .xls, almacenamiento local de imágenes/vídeos. 14 días de garantía.',
    oldPriceId: 'price_1SIWbd2ddZJyDXloj0BSlhuT',
    newPrice: {
      unit_amount: 300, // 3.00€
      currency: 'eur',
      recurring: {
        interval: 'year' as const,
        interval_count: 1,
      },
    },
    days: 365,
  },
  {
    id: 'prod_TF0dK0PEHdvdZa',
    name: 'Plan 3 Años',
    description: 'Acceso completo durante 3 años con ahorro. Incluye: historial ilimitado, exportación a .xls, almacenamiento local de imágenes/vídeos. 14 días de garantía.',
    oldPriceId: 'price_1SIWc52ddZJyDXloyy3hWlJG',
    newPrice: {
      unit_amount: 750, // 7.50€
      currency: 'eur',
      recurring: {
        interval: 'year' as const,
        interval_count: 3,
      },
    },
    days: 1095,
  },
  {
    id: 'prod_TF0dCIDs0jX1QP',
    name: 'Plan Para Siempre',
    description: 'Acceso de por vida sin renovaciones. Pago único. Incluye: historial ilimitado, exportación a .xls, almacenamiento local de imágenes/vídeos. 14 días de garantía.',
    oldPriceId: 'price_1SIWcf2ddZJyDXloU5vmDqet',
    // Este plan se mantiene como one_time
    newPrice: null,
    days: 100000,
    skipRecurring: true,
  },
];

async function main() {
  console.log('🚀 Iniciando actualización de Stripe...\n');
  console.log(`   Modo: ${STRIPE_SECRET_KEY!.startsWith('sk_test') ? 'TEST' : 'LIVE'}\n`);

  const results: any[] = [];
  const sqlStatements: string[] = [];

  for (const config of PRODUCTS_CONFIG) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📦 Procesando: ${config.name}`);
    console.log(`${'='.repeat(60)}`);
    
    try {
      // 1. Actualizar producto con descripción
      console.log(`\n  ✏️  Actualizando producto...`);
      const product = await stripe.products.update(config.id, {
        name: config.name,
        description: config.description,
      });
      console.log(`  ✅ Producto actualizado`);
      console.log(`     ID: ${product.id}`);
      console.log(`     Nombre: ${product.name}`);
      console.log(`     Descripción: ${product.description?.substring(0, 50)}...`);

      // 2. Crear nuevo precio (solo si no es skipRecurring)
      if (config.skipRecurring) {
        console.log(`\n  ℹ️  Plan "Para Siempre" se mantiene como pago único`);
        
        // Actualizar el precio existente con metadata
        await stripe.prices.update(config.oldPriceId, {
          metadata: {
            plan_type: 'lifetime',
            days: String(config.days),
          },
        });
        
        results.push({
          product: config.name,
          type: 'one_time',
          priceId: config.oldPriceId,
          amount: '27.90€',
          status: 'updated',
        });
        continue;
      }

      console.log(`\n  💰 Creando precio recurrente...`);
      const priceParams: Stripe.PriceCreateParams = {
        product: config.id,
        currency: config.newPrice!.currency,
        unit_amount: config.newPrice!.unit_amount,
        recurring: config.newPrice!.recurring,
        active: true,
        metadata: {
          days: String(config.days),
          migrated_from: config.oldPriceId,
        },
      };

      const newPrice = await stripe.prices.create(priceParams);
      console.log(`  ✅ Precio recurrente creado`);
      console.log(`     ID: ${newPrice.id}`);
      console.log(`     Monto: ${(newPrice.unit_amount! / 100).toFixed(2)}€`);
      console.log(`     Intervalo: ${newPrice.recurring?.interval} x ${newPrice.recurring?.interval_count}`);

      // 3. Establecer como precio por defecto
      console.log(`\n  🔧 Estableciendo como precio por defecto...`);
      await stripe.products.update(config.id, {
        default_price: newPrice.id,
      });
      console.log(`  ✅ Precio por defecto actualizado`);

      // 4. Archivar precio antiguo
      console.log(`\n  📥 Archivando precio antiguo...`);
      await stripe.prices.update(config.oldPriceId, {
        active: false,
        metadata: {
          archived_reason: 'migrated_to_recurring',
          new_price_id: newPrice.id,
        },
      });
      console.log(`  ✅ Precio antiguo archivado: ${config.oldPriceId}`);

      // Generar SQL para Supabase
      sqlStatements.push(
        `UPDATE subscription_plans SET stripe_price_id = '${newPrice.id}', name = '${config.name}' WHERE stripe_price_id = '${config.oldPriceId}';`
      );

      results.push({
        product: config.name,
        type: 'recurring',
        oldPriceId: config.oldPriceId,
        newPriceId: newPrice.id,
        amount: `${(newPrice.unit_amount! / 100).toFixed(2)}€`,
        interval: `${newPrice.recurring?.interval_count} ${newPrice.recurring?.interval}(s)`,
        status: 'created',
      });

    } catch (error: any) {
      console.error(`\n  ❌ Error procesando ${config.name}:`, error.message);
      results.push({
        product: config.name,
        status: 'error',
        error: error.message,
      });
    }
  }

  // Resumen
  console.log(`\n\n${'='.repeat(60)}`);
  console.log('📊 RESUMEN DE MIGRACIÓN');
  console.log(`${'='.repeat(60)}\n`);
  console.table(results);

  if (sqlStatements.length > 0) {
    console.log(`\n\n${'='.repeat(60)}`);
    console.log('💾 SQL PARA SUPABASE');
    console.log(`${'='.repeat(60)}\n`);
    console.log('-- Ejecuta estos comandos en Supabase SQL Editor:\n');
    sqlStatements.forEach(sql => console.log(sql));
    console.log('\n-- Verificar actualización:');
    console.log('SELECT id, name, stripe_price_id, days, amount_cents FROM subscription_plans WHERE active = true ORDER BY days;\n');
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log('✅ MIGRACIÓN COMPLETADA');
  console.log(`${'='.repeat(60)}\n`);
  console.log('Próximos pasos:');
  console.log('1. Ejecuta el SQL en Supabase para actualizar los price_ids');
  console.log('2. Prueba el flujo de checkout en test mode');
  console.log('3. Verifica que los webhooks funcionen correctamente');
  console.log('4. Cuando esté todo validado, repite en live mode\n');
}

main().catch((error) => {
  console.error('\n❌ Error fatal:', error.message);
  console.error(error.stack);
  process.exit(1);
});
