import 'server-only';
import { Resend } from 'resend';

export type ResendConfig = {
  apiKey: string;
  from: string;
};

export type SendHtmlEmailInput = {
  to: string;
  subject: string;
  html: string;
};

export type SendHtmlEmailResult =
  | { ok: true; id?: string }
  | { ok: false; code: 'not_configured' | 'send_failed'; message: string };

export function getResendConfig(): ResendConfig | null {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM?.trim();
  if (!apiKey || !from) return null;
  return { apiKey, from };
}

export async function sendHtmlEmail(input: SendHtmlEmailInput): Promise<SendHtmlEmailResult> {
  const config = getResendConfig();
  if (!config) {
    return {
      ok: false,
      code: 'not_configured',
      message: 'RESEND_API_KEY o RESEND_FROM no configurados; correo no enviado.',
    };
  }

  try {
    const resend = new Resend(config.apiKey);
    const { data, error } = await resend.emails.send({
      from: config.from,
      to: input.to,
      subject: input.subject,
      html: input.html,
    });
    if (error) {
      return { ok: false, code: 'send_failed', message: error.message ?? 'Resend error' };
    }
    return { ok: true, id: data?.id };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Error desconocido al enviar correo';
    return { ok: false, code: 'send_failed', message };
  }
}
