import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { buildEmailOptions, normalizeLoggedIn, validateContactPayload } from '@/lib/contact/send';

export const runtime = 'nodejs';

function getEnv(name: string, fallback?: string) {
    const v = process.env[name] ?? fallback;
    if (!v) throw new Error(`Falta la variable ${name}`);
    return v;
}

export async function POST(req: Request) {
    try {
        const contentType = req.headers.get('content-type') || '';
        let payload: Record<string, string> = {};
        if (contentType.includes('multipart/form-data')) {
            const form = await req.formData();
            form.forEach((v, k) => {
                if (typeof v === 'string') payload[k] = v;
            });
        } else if (contentType.includes('application/json')) {
            payload = await req.json();
        } else if (contentType.includes('application/x-www-form-urlencoded')) {
            const text = await req.text();
            payload = Object.fromEntries(new URLSearchParams(text));
        } else {
            payload = {};
        }

        // Honeypot
        if (payload.website) return NextResponse.json({ message: 'OK' }, { status: 200 });

        const loggedIn = normalizeLoggedIn(payload.logged_in);
        const name = payload.name?.trim();
        const email = payload.email?.trim();
        const phone = payload.phone?.trim();
        const subject = payload.subject?.trim();
        const message = payload.message?.trim();

        const { ok, errors } = validateContactPayload({ logged_in: loggedIn, name, email, phone, subject, message });
        if (!ok) {
          return NextResponse.json({ message: 'Validación fallida', errors }, { status: 400 });
        }

        const SMTP_HOST = getEnv('SMTP_HOST');
        const SMTP_PORT = Number(getEnv('SMTP_PORT', '587'));
        const SMTP_USER = getEnv('SMTP_USER');
        const SMTP_PASS = getEnv('SMTP_PASS');
        const CONTACT_TO = getEnv('CONTACT_TO');
        const CONTACT_FROM = process.env.CONTACT_FROM || SMTP_USER;

        const transporter = nodemailer.createTransport({
          host: SMTP_HOST,
          port: SMTP_PORT,
          secure: SMTP_PORT === 465,
          auth: { user: SMTP_USER, pass: SMTP_PASS },
        });

        const { mail } = buildEmailOptions(
            {
            loggedIn,
            // nombres desde el form (cuando hay sesión vienen como hidden)
            full_name: payload.full_name,
            first_name: payload.first_name || payload.name,
            last_name:  payload.last_name  || payload.surname,
            // compat para anónimos
            name,
            email,
            phone,
            subject: subject!,
            message: message!,
            },
            CONTACT_FROM,
            CONTACT_TO
        );

        await transporter.sendMail(mail);

        return NextResponse.json({ ok: true });
    } catch (e: any) {
        console.error(e);
        return NextResponse.json({ message: e.message || 'No se pudo enviar el email.' }, { status: 500 });
    }
}