// src/lib/storage-plans.ts
// Planes de almacenamiento en la nube (Cloudflare R2)

export type StoragePlan = {
    id: string;
    /** Clave i18n para el nombre del plan */
    nameKey: string;
    /** Nombre ya resuelto (opcional, se rellena con i18n) */
    name?: string;
    /** Almacenamiento en GB */
    gb_amount: number;
    /** Precio en céntimos (EUR) por año */
    amount_cents: number;
    currency: 'EUR';
    /** Duración en días */
    days: number;
    active: boolean;
    /** Stripe Price ID (se sobreescribe desde base de datos) */
    stripe_price_id?: string | null;
    /** Destacar visualmente como más popular */
    popular?: boolean;
    /** Destacar como máxima capacidad */
    maxCapacity?: boolean;
    /** Claves i18n de features incluidas */
    featureKeys: string[];
};

export type StoragePlanChoice = StoragePlan & { name: string };

// ─── Planes locales (fallback si la BD no devuelve resultados) ────────────────
// Precios basados en el coste de Cloudflare R2 + márgenes de servicio razonables
// para equipos deportivos amateurs y semiprofesionales.
export const LOCAL_STORAGE_PLANS: StoragePlan[] = [
    {
        id: 'storage-basic',
        nameKey: 'storage_plan_basico',
        gb_amount: 10,
        amount_cents: 1990,   // 19.90 €/año ≈ 1.66 €/mes
        currency: 'EUR',
        days: 365,
        active: true,
        popular: false,
        maxCapacity: false,
        featureKeys: [
            'storage_feature_espacio',
            'storage_feature_dispositivos',
            'storage_feature_r2',
            'storage_feature_reembolso',
        ],
    },
    {
        id: 'storage-standard',
        nameKey: 'storage_plan_estandar',
        gb_amount: 50,
        amount_cents: 4990,   // 49.90 €/año ≈ 4.16 €/mes
        currency: 'EUR',
        days: 365,
        active: true,
        popular: true,
        maxCapacity: false,
        featureKeys: [
            'storage_feature_espacio',
            'storage_feature_dispositivos',
            'storage_feature_r2',
            'storage_feature_prioridad',
            'storage_feature_reembolso',
        ],
    },
    {
        id: 'storage-pro',
        nameKey: 'storage_plan_pro',
        gb_amount: 200,
        amount_cents: 9990,   // 99.90 €/año ≈ 8.33 €/mes
        currency: 'EUR',
        days: 365,
        active: true,
        popular: false,
        maxCapacity: true,
        featureKeys: [
            'storage_feature_espacio',
            'storage_feature_dispositivos',
            'storage_feature_r2',
            'storage_feature_prioridad',
            'storage_feature_multiequipo',
            'storage_feature_reembolso',
        ],
    },
];

// ─── Utilidades ──────────────────────────────────────────────────────────────

export function storagePlanName(
    plan: StoragePlan,
    t: (k: string) => string,
    fallback: string = ''
): string {
    if (plan.name && String(plan.name).trim().length > 0) return plan.name;
    try {
        return t(plan.nameKey) || fallback || plan.nameKey;
    } catch {
        return fallback || plan.nameKey;
    }
}

export function applyI18nToStoragePlans(
    plans: StoragePlan[],
    t: (k: string) => string
): StoragePlanChoice[] {
    return plans.map((p) => ({ ...p, name: storagePlanName(p, t) }));
}

/** Precio formateado con dos decimales */
export function storagePriceEuros(cents: number): string {
    return (cents / 100).toFixed(2);
}

/** Precio mensual aproximado */
export function storageMonthlyEuros(cents: number, days: number): string {
    const months = days / 30;
    return (cents / 100 / months).toFixed(2);
}
