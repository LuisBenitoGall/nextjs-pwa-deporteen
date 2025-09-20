'use client';
import * as React from 'react';
import { useT } from '@/i18n/I18nProvider';

//Components
import Checkbox from '@/components/Checkbox';
import Input from '@/components/Input';
import Submit from '@/components/Submit';
import UITextarea from '@/components/Textarea';

type SessionUser = { id: string; email?: string | null; user_metadata?: Record<string, any> } | null;

const SupportFormComponent = ({ sessionUser, onSuccess }: { sessionUser: SessionUser; onSuccess?: () => void }) => {
    const t = useT();
    const [submitting, setSubmitting] = React.useState(false);
    // Nota: el mensaje de éxito se muestra en la página padre vía onSuccess
    const [ok, setOk] = React.useState<null | string>(null);
    const [err, setErr] = React.useState<null | string>(null);

    async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setSubmitting(true);
        setOk(null);
        setErr(null);

        const form = e.currentTarget;
        const formData = new FormData(form);

        // Simple honeypot check
        if ((formData.get('website') as string)?.trim()) {
            setSubmitting(false);
            setErr('Error al enviar.');
            return;
        }

        try {
            const res = await fetch('/api/contact', {
                method: 'POST',
                body: formData,
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.message || 'Error');
            form.reset();
            setOk(null); // no mostramos mensaje local
            onSuccess && onSuccess();
        } catch (e: any) {
            setErr(e.message || t('mensaje_no_enviado'));
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <form onSubmit={onSubmit} className="space-y-4">
            {/* Honeypot */}
            <input type="text" name="website" className="hidden" tabIndex={-1} autoComplete="off" />

            {!sessionUser && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <Input
                            type="text"
                            name="name"
                            placeholder={t('nombre')}
                            label={t('nombre')}
                            required
                        />
                    </div>
                
                    <div>
                        <Input
                            type="email"
                            name="email"
                            placeholder={t('email')}
                            label={t('email')}
                            required
                        />
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <Input
                        type="text"
                        name="phone"
                        placeholder={t('telf')}
                        label={`${t('telf')} (${t('opcional')})`}
                    />
                </div>
        
                <div>
                    <Input
                        type="text"
                        name="subject"
                        placeholder={t('asunto')}
                        label={t('asunto')}
                        required
                    />
                </div>
            </div>

            <div>
                <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">{t('mensaje')}</label>
                <UITextarea id="message" name="message" required rows={6} placeholder={t('consulta_texto')} />
            </div>

            {/* Terms checkbox using project Checkbox component */}
            <div className="flex items-start gap-3">
                <Checkbox
                    id="terms"
                    name="terms"
                    required
                    label={<span className="text-sm text-gray-700">{t('contacto_acepta_condiciones')}</span>}
                />
            </div>

            {/* If logged in, pass context (no need to ask email) */}
            {sessionUser && (
                <>
                    <input type="hidden" name="logged_in" value="true" />
                    <input type="hidden" name="user_id" value={sessionUser.id} />
                    {sessionUser.email && <input type="hidden" name="email" value={sessionUser.email} />}
                    {sessionUser.user_metadata?.full_name && (
                        <input type="hidden" name="full_name" value={sessionUser.user_metadata.full_name} />
                    )}
                    {/* Si llevas nombre y apellidos separados en metadata, aún mejor: */}
                    {sessionUser.user_metadata?.name && (
                        <input type="hidden" name="first_name" value={sessionUser.user_metadata.name} />
                    )}
                    {sessionUser.user_metadata?.surname && (
                        <input type="hidden" name="last_name" value={sessionUser.user_metadata.surname} />
                    )}
                    {!sessionUser.user_metadata?.full_name && sessionUser.user_metadata?.name && (
                        <input type="hidden" name="full_name" value={sessionUser.user_metadata.name} />
                    )}
                </>
            )}

            <div className="pt-2">
                <Submit
                    loading={submitting}
                    text={t('enviar') ?? 'Enviar'}
                    loadingText={t('enviando') ?? t('procesando') ?? 'Enviando…'}
                />
            </div>
      
            {err && <p className="text-sm text-red-700">{err}</p>}
        </form>
    );
};

SupportFormComponent.displayName = 'SupportForm';
export default SupportFormComponent;