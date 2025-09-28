


## QUERIES:
	- Truncate de tablas:
	BEGIN;
	TRUNCATE TABLE
	  public.competitions,
	  public.teams,
	  public.clubs,
	  public.player_seasons,
	  public.players,
	  public.access_code_usages,
	  public.subscriptions
	RESTART IDENTITY CASCADE;
	COMMIT;













This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Configuración de Stripe

Para que el panel de administración pueda crear y gestionar cupones, precios, enlaces de pago e invoices en Stripe, debes definir las siguientes variables en tu `.env` (o en el proveedor de despliegue) **con tus propios valores**:

```bash
STRIPE_SECRET_KEY=sk_live_o_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_o_test_...
NEXT_PUBLIC_ADMIN_EMAILS=admin@tu-dominio.com,otro@tu-dominio.com
```

- **`STRIPE_SECRET_KEY`** se usa únicamente en el backend de Next.js para llamar a la API de Stripe.
- **`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`** se expone en el cliente para las integraciones que lo requieran.
- **`NEXT_PUBLIC_ADMIN_EMAILS`** es una lista separada por comas con los correos que tendrán acceso a la administración de Stripe.

Solo las cuentas con rol de administrador acceden a las rutas de gestión de Stripe (`/admin/stripe/...`). Asegúrate de mantener las claves fuera del control de versiones y de almacenarlas en un gestor seguro.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
