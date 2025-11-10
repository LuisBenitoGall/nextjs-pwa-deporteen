#!/usr/bin/env tsx
/**
 * Script para migrar productos de Stripe de one_time a recurring
 * y agregar descripciones apropiadas
 */

import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-08-27.basil',
});

const PRODUCTS_CONFIG = [
  {
    id: 'prod_TF0csWy77LohrX',
    name: 'Plan Anual',
    description: 'Acceso completo durante 1 año. Incluye: historial ilimitado, exportación a .xls, almacenamiento local de imágenes/vídeos. 14 días de garantía.',
    oldPriceId: 'price_1SIWbd2ddZJyDXloj0BSlhuT',
    newPrice: {
      unit_amount: 300, // 3.00€ en centavos
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
      unit_amount: 750, // 7.50€ en centavos
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
    newPrice: {
      unit_amount: 2790, // 27.90€ en centavos
      currency: 'eur',
      // Para el plan "Para Siempre", mantenemos one_time pero con mejor descripción
      recurring: null,
    },
    days: 100000,
  },
];

async function main() {
  console.log('🚀 Iniciando migración de productos y precios en Stripe...\n');

  const results: any[] = [];

  for (const config of PRODUCTS_CONFIG) {
    console.log(`📦 Procesando: ${config.name}`);
    
    try {
      // 1. Actualizar producto con descripción
      console.log(`  ✏️  Actualizando descripción del producto...`);
      const product = await stripe.products.update(config.id, {
        name: config.name,
        description: config.description,
      });
      console.log(`  ✅ Producto actualizado: ${product.name}`);

      // 2. Crear nuevo precio
      console.log(`  💰 Creando nuevo precio...`);
      const priceParams: Stripe.PriceCreateParams = {
        product: config.id,
        currency: config.newPrice.currency,
        unit_amount: config.newPrice.unit_amount,
        active: true,
      };

      if (config.newPrice.recurring) {
        priceParams.recurring = config.newPrice.recurring;
      }

      const newPrice = await stripe.prices.create(priceParams);
      console.log(`  ✅ Nuevo precio creado: ${newPrice.id}`);

      // 3. Establecer como precio por defecto
      console.log(`  🔧 Estableciendo como precio por defecto...`);
      await stripe.products.update(config.id, {
        default_price: newPrice.id,
      });

      // 4. Archivar precio antiguo
      console.log(`  📥 Archivando precio antiguo...`);
      await stripe.prices.update(config.oldPriceId, {
        active: false,
      });
      console.log(`  ✅ Precio antiguo archivado: ${config.oldPriceId}\n`);

      results.push({
        product: config.name,
        productId: config.id,
        oldPriceId: config.oldPriceId,
        newPriceId: newPrice.id,
        days: config.days,
        amount_cents: config.newPrice.unit_amount,
        recurring: config.newPrice.recurring ? 'yes' : 'no',
      });

    } catch (error: any) {
      console.error(`  ❌ Error procesando ${config.name}:`, error.message);
      results.push({
        product: config.name,
        error: error.message,
      });
    }
  }

  console.log('\n📊 Resumen de migración:');
  console.log('═══════════════════════════════════════════════════════════');
  console.table(results);

  console.log('\n⚠️  IMPORTANTE: Ahora debes actualizar la tabla subscription_plans en Supabase');
  console.log('con los nuevos price_ids. Ejecuta el siguiente SQL:\n');

  results.forEach((r) => {
    if (!r.error && r.newPriceId) {
      console.log(`UPDATE subscription_plans SET stripe_price_id = '${r.newPriceId}', name = '${r.product}' WHERE stripe_price_id = '${r.oldPriceId}';`);
    }
  });

  console.log('\n✅ Migración completada!');
}

main().catch((error) => {
  console.error('❌ Error fatal:', error);
  process.exit(1);
});
