import type { Transporter } from 'nodemailer';

export type ContactPayload = {
  logged_in?: string | boolean;
  user_id?: string; // ignorado en el email
  name?: string; // nombre completo en un solo campo
  first_name?: string;
  last_name?: string;
  full_name?: string; // alias aceptado
  email?: string;
  phone?: string;
  subject?: string;
  message?: string;
  website?: string; // honeypot
};

export function normalizeLoggedIn(v: any): boolean {
  if (typeof v === 'boolean') return v;
  if (v === undefined || v === null) return false;
  return String(v).toLowerCase() === 'true';
}

export function validateContactPayload(data: ContactPayload) {
  // No cambio validaciones para no tocar tests existentes
  const errors: Record<string, string> = {};
  const loggedIn = normalizeLoggedIn(data.logged_in);
  if (!data.subject || !data.subject.trim()) errors.subject = 'Asunto requerido';
  if (!data.message || !data.message.trim()) errors.message = 'Mensaje requerido';
  if (!loggedIn) {
    if (!data.name || !data.name.trim()) errors.name = 'Nombre requerido';
    if (!data.email || !data.email.trim()) errors.email = 'Email requerido';
  }
  return { ok: Object.keys(errors).length === 0, errors };
}

// Deriva Nombre y Apellidos desde distintas combinaciones
function deriveNameParts(data: Partial<ContactPayload>) {
  const raw =
    (data.first_name && data.last_name)
      ? `${data.first_name} ${data.last_name}`
      : (data.full_name || data.name || '').trim();

  if (!raw) return { first: '', last: '' };

  const parts = raw.split(/\s+/);
  if (parts.length === 1) return { first: parts[0], last: '' };
  const first = parts.shift() as string;
  const last = parts.join(' ');
  return { first, last };
}

export function buildEmailOptions(
  data: Required<Pick<ContactPayload, 'subject' | 'message'>> &
    Partial<Pick<ContactPayload, 'name' | 'email' | 'phone' | 'user_id' | 'first_name' | 'last_name' | 'full_name'>> & { loggedIn: boolean },
  contactFrom: string,
  contactTo: string
) {
    const receivedAt = new Date().toISOString();
    const { first, last } = deriveNameParts(data);

    const html = `
    <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;">
      <h2 style="margin:0 0 8px 0;">Nuevo contacto</h2>
      <p style="margin:0 0 16px 0; color:#555">${receivedAt}</p>
      <table cellpadding="6" cellspacing="0" style="border-collapse:collapse;">
        ${data.email ? `<tr><td><b>Email</b></td><td>${data.email}</td></tr>` : ''}
        ${(data as any).first_name || (data as any).name ? `<tr><td><b>Nombre</b></td><td>${(data as any).first_name ?? (data as any).name}</td></tr>` : ''}
        ${(data as any).last_name  || (data as any).surname ? `<tr><td><b>Apellidos</b></td><td>${(data as any).last_name ?? (data as any).surname}</td></tr>` : ''}

        ${data.phone ? `<tr><td><b>Teléfono</b></td><td>${data.phone}</td></tr>` : ''}
        <tr><td><b>Asunto</b></td><td>${data.subject}</td></tr>
        <tr><td style="vertical-align:top"><b>Mensaje</b></td><td><pre style="white-space:pre-wrap; font:inherit">${data.message}</pre></td></tr>
      </table>
    </div>`;

    const plainNameLine =
    first || last
    ? `\nNombre: ${first}${last ? `\nApellidos: ${((data as any).last_name ?? (data as any).surname) || ''}` : ''}`
    : '';

    return {
    mail: {
      from: contactFrom,
      to: contactTo,
      subject: `[Contacto] ${data.subject}`,
      text:
        `Asunto: ${data.subject}\n\n` +
        `Mensaje:\n${data.message}\n\n—` +
        `${plainNameLine}` +
        `${data.email ? `\nEmail: ${data.email}` : ''}` +
        `${data.phone ? `\nTel: ${data.phone}` : ''}`,
      html,
      replyTo: data.email || undefined,
    },
  };
}

export async function sendContactEmail(
  transporter: Transporter,
  mailOptions: Parameters<Transporter['sendMail']>[0]
) {
  return transporter.sendMail(mailOptions);
}
