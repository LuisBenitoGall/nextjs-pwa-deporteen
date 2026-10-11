export type Currency = 'EUR';

/** Fila de `subscription_plans` tal como la devuelve Supabase en el cliente/servidor. */
export type SubscriptionPlanDbRow = {
    id: string;
    name?: string | null;
    days: number;
    amount_cents: number;
    currency?: string | null;
    active: boolean;
    free: boolean;
    metadata?: unknown;
    stripe_price_id?: string | null;
};

export type Plan = {
    id: string;

    /** Clave i18n, ej: 'plan_anual', 'plan_trianual', 'plan_siempre' */
    nameKey: string;

    /** Nombre legible fijo (p. ej. desde BD). Si no viene, se usa t(nameKey). */
    name?: string;

    days: number;
    amount_cents: number;
    currency: Currency;
    active: boolean;
    free: boolean;
};

const PLAN_I18N_KEY_RE = /^plan_[a-z0-9_]+$/;

/** True si el texto parece una clave i18n de plan (p. ej. `plan_anual`), no un título humano. */
export function isSubscriptionPlanI18nKey(value: string): boolean {
    const v = value.trim();
    return PLAN_I18N_KEY_RE.test(v) && !/\s/.test(v);
}

/** Inferir clave i18n conocida a partir de la duración en días. */
export function inferSubscriptionPlanNameKey(days: number): string | undefined {
    if (!Number.isFinite(days) || days <= 0) return undefined;
    if (days >= 50000) return 'plan_siempre';
    if (days >= 1000 && days <= 1200) return 'plan_trianual';
    if (days >= 330 && days <= 400) return 'plan_anual';
    return undefined;
}

function metadataNameKey(metadata: unknown): string | undefined {
    if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return undefined;
    const nk = (metadata as Record<string, unknown>).name_key;
    return typeof nk === 'string' && nk.trim() ? nk.trim() : undefined;
}

/**
 * Convierte una fila de BD en `Plan` con `nameKey` garantizado para i18n.
 * Si `name` en BD es una clave i18n o falta, se resuelve vía nameKey + traducción.
 */
export function normalizeSubscriptionPlanFromDb(row: SubscriptionPlanDbRow): Plan {
    const rawName = (row.name ?? '').trim();
    const metaKey = metadataNameKey(row.metadata);
    const inferred = inferSubscriptionPlanNameKey(Number(row.days));

    const nameKey =
        metaKey ||
        (rawName && isSubscriptionPlanI18nKey(rawName) ? rawName : undefined) ||
        inferred ||
        rawName ||
        row.id;

    const displayName =
        rawName && !isSubscriptionPlanI18nKey(rawName) && rawName !== nameKey ? rawName : undefined;

    const currencyRaw = (row.currency ?? 'EUR').toString().toUpperCase();

    return {
        id: row.id,
        nameKey,
        ...(displayName ? { name: displayName } : {}),
        days: Number(row.days) || 0,
        amount_cents: Number(row.amount_cents) || 0,
        currency: currencyRaw === 'EUR' ? 'EUR' : 'EUR',
        active: Boolean(row.active),
        free: Boolean(row.free),
    };
}

export function normalizeSubscriptionPlansFromDb(rows: SubscriptionPlanDbRow[]): Plan[] {
    return rows
        .map(normalizeSubscriptionPlanFromDb)
        .filter((p) => p.active && !p.free && p.days > 0 && Number.isFinite(p.amount_cents));
}

export type PlanChoice = Plan & {
    /** Nombre ya traducido y garantizado */
    name: string;
};

// ---------- Utilidades numéricas ----------
export function euros(cents: number) {
    return (cents / 100).toFixed(2);
}

export function yearsFromDays(days: number) {
    return Math.round((days / 365) * 10) / 10;
}

export function isLifetime(p: Pick<Plan, 'days'>) {
    // Con days >= ~137 años asumimos vida útil “para siempre”.
    return p.days >= 50000;
}

// ---------- Resolución i18n ----------
/** Devuelve el nombre del plan usando t(nameKey). Respeta `name` humano; traduce claves i18n en `name`. */
export function planNameForT(
    plan: Plan,
    t: (k: string) => string,
    fallback: string = ''
) {
    const rawName = (plan.name ?? '').trim();
    const nameKey =
        (plan.nameKey ?? '').trim() ||
        inferSubscriptionPlanNameKey(plan.days) ||
        (rawName && isSubscriptionPlanI18nKey(rawName) ? rawName : '') ||
        plan.id;

    if (rawName && !isSubscriptionPlanI18nKey(rawName)) {
        return rawName;
    }

    const keyForT = rawName && isSubscriptionPlanI18nKey(rawName) ? rawName : nameKey;

    try {
        const translated = t(keyForT);
        if (translated) return translated;
        if (rawName) return rawName;
        return fallback || keyForT;
    } catch {
        return fallback || rawName || keyForT;
    }
}

export type WithName<T> = T & { name: string };

/** Devuelve una copia de los planes con `name` ya resuelto mediante t(). */
export function applyI18nToPlans<T extends Plan>(
    plans: T[],
    t: (k: string) => string
): WithName<T>[] {
    return plans.map((p) => ({ ...p, name: planNameForT(p, t) }));
}

// ---------- Planes locales (fallback) ----------
// NOTA: aquí solo guardamos claves. Las traducciones viven en tus JSON de i18n.
export const LOCAL_FREE_PLAN: Plan = {
    id: 'free-code-hidden',
    nameKey: 'plan_codigo_oculto',
    days: 15,           
    amount_cents: 0,
    currency: 'EUR',
    active: true,
    free: true,
};

export const LOCAL_PAID_PLANS: Plan[] = [
    {
        id: 'plan-1y',
        nameKey: 'plan_anual',
        days: 365,
        amount_cents: 300,
        currency: 'EUR' as const,
        active: true,
        free: false,
    },
    {
        id: 'plan-3y',
        nameKey: 'plan_trianual',
        days: 1095,
        amount_cents: 750,
        currency: 'EUR' as const,
        active: true,
        free: false,
    },
    {
        id: 'plan-lt',
        nameKey: 'plan_siempre',
        days: 100000,
        amount_cents: 2790,
        currency: 'EUR' as const,
        active: true,
        free: false,
    },
].filter((p) => p.active);
