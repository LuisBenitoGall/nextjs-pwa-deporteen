export type Currency = 'EUR';

export type Plan = {
    id: string;

    /** Clave i18n, ej: 'plan_1_anio', 'plan_3_anios', 'plan_para_siempre' */
    nameKey: string;

    /** Nombre traducido (opcional). Si no viene, se usa t(nameKey). */
    name?: string;

    days: number;
    price_cents: number;
    currency: Currency;
    active: boolean;
    free: boolean;
};

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
/** Devuelve el nombre del plan usando t(nameKey). Si ya trae `name`, la respeta. */
export function planNameForT(
    plan: Plan,
    t: (k: string) => string,
    fallback: string = ''
) {
    if (plan.name && String(plan.name).trim().length > 0) return plan.name;
    try {
        return t(plan.nameKey) || fallback || plan.nameKey;
    } catch {
        return fallback || plan.nameKey;
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
    price_cents: 0,
    currency: 'EUR',
    active: true,
    free: true,
};

export const LOCAL_PAID_PLANS: Plan[] = [
    {
        id: 'plan-1y',
        nameKey: 'plan_anual',
        days: 365,
        price_cents: 300,
        currency: 'EUR' as const,
        active: true,
        free: false,
    },
    {
        id: 'plan-3y',
        nameKey: 'plan_trianual',
        days: 1095,
        price_cents: 750,
        currency: 'EUR' as const,
        active: true,
        free: false,
    },
    {
        id: 'plan-lt',
        nameKey: 'plan_siempre',
        days: 100000,
        price_cents: 2790,
        currency: 'EUR' as const,
        active: true,
        free: false,
    },
].filter((p) => p.active);
