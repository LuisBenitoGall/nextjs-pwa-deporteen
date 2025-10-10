'use client';
import { supabase } from '@/lib/supabase/client';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useT, useLocale } from '@/i18n/I18nProvider';
import Link from 'next/link';

// Components
import Checkbox from '../../components/Checkbox';
import Input from '../../components/Input';
import Select from '../../components/Select';
import Submit from '../../components/Submit';
import TitleH1 from '../../components/TitleH1';

// Validation
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

const schema = z.object({
    name: z.string().min(2, 'Mínimo 2 caracteres'),
    surname: z.string().min(2, 'Mínimo 2 caracteres'),
    email: z.string().email('Email no válido'),
    password: z.string().min(8, 'Mínimo 8 caracteres'),
    confirm_password: z.string().min(8, 'Mínimo 8 caracteres'),
    locale: z.string().length(2, 'Código de idioma de 2 letras').optional(),
    accepted_terms: z
    .boolean()
    .refine((v) => v === true, { message: 'Debes aceptar los Términos y la Privacidad' }),
    accepted_marketing: z.boolean().optional()
}).refine(data => data.password === data.confirm_password, {
    message: 'Las contraseñas no coinciden',
    path: ['confirm_password']
});

type FormData = z.infer<typeof schema>;

export default function RegistroPage() {
    const t = useT();
    const router = useRouter();
    const [submitting, setSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const { locales } = useLocale();

    const {
        register,
        handleSubmit,
        formState: { errors },
        setValue,
        watch
    } = useForm<FormData>({
        resolver: zodResolver(schema),
        defaultValues: {
              name: '',
              surname: '',
              email: '',
              password: '',
              confirm_password: '',
              locale: '',
              accepted_terms: false,
              accepted_marketing: false
        }
    });

    // Autodetecta idioma del navegador (es, ca, eu, gl, en... lo que venga)
    useEffect(() => {
        try {
            const code = (navigator.language || 'es').slice(0, 2).toLowerCase();
            if (!watch('locale')) setValue('locale', code);
            setValue('locale', code);
        } catch {}
    }, [setValue, watch]);

    const onSubmit = async (data: FormData) => {
        setSubmitting(true);
        setErrorMsg(null);
        try {
            // Alta en Auth con metadatos
            const { error: signUpError } = await supabase.auth.signUp({
                email: data.email,
                password: data.password,
                options: {
                    data: {
                        name: data.name,
                        surname: data.surname,
                        accepted_terms: data.accepted_terms,
                        //accepted_marketing: !!data.accepted_marketing,
                        locale: (data.locale && data.locale.trim().slice(0,2).toLowerCase())
                            || (navigator.language || 'es').slice(0,2).toLowerCase()
                    }
                }
            });
            if (signUpError) throw signUpError;

            // A veces Supabase no devuelve session aunque no pidas confirmación: iniciamos sesión explícitamente.
            const { error: signInErr } = await supabase.auth.signInWithPassword({
                email: data.email,
                password: data.password
            });

            if (signInErr) {
                // Si algún día activas confirmación por email, caerá aquí
                const msg = signInErr.message?.toLowerCase() || '';
                if (msg.includes('confirm') || msg.includes('confirmación') || msg.includes('email not confirmed')) {
                    router.replace('/auth/check-email');
                    return;
                }
                throw signInErr;
            }
            router.refresh();        // <- fuerza a Next a leer cookies nuevas
            // La sync a public.users la hace el trigger; no hace falta upsert manual.
            router.replace('/dashboard');
        } catch (err: any) {
            setErrorMsg(err.message ?? 'Error desconocido creando la cuenta');
        } finally {
            setSubmitting(false);
        }
    };

    const handleGoogle = async () => {
        setErrorMsg(null);
        // Guarda el locale preferido para aplicarlo al volver del OAuth
        try {
            const chosen =
                (watch('locale') || (navigator.language || 'es').slice(0, 2)).toLowerCase();
                localStorage.setItem('preferred_locale', chosen);
        } catch {}

        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo: `${location.origin}/auth/callback` }
        });
        if (error) setErrorMsg(error.message);
    };

    return (
        <div>
            <TitleH1>{t('registro_h1')}</TitleH1>

            <div className="text-center text-sm text-gray-500 mb-6">
                <Link href="/login" className="hover:text-green-600 transition underline">
                    {t('cuenta_tengo')}
                </Link>
            </div>

            <button
                type="button"
                onClick={handleGoogle}
                className="w-full flex items-center justify-center gap-3 bg-white border border-gray-300 text-gray-700 font-medium py-3 rounded-lg shadow-sm hover:bg-gray-50 mb-6"
            >
                <Image src="/icons/icon-google.svg" alt="Google" width={20} height={20} />
                <span>{t('registrate_google')}</span>
            </button>

            <div className="text-center text-sm text-gray-500 mb-6">{t('formulario_completa')}</div>

            {errorMsg && (
                <div className="mb-4 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">
                    {errorMsg}
                </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <Input
                    type="text"
                    {...register('name')}
                    placeholder={t('nombre')}
                    label={t('nombre')}
                    error={errors.name?.message}
                    required
                />
            
                <Input
                    type="text"
                    {...register('surname')}
                    placeholder={t('apellidos')}
                    label={t('apellidos')}
                    error={errors.surname?.message}
                    required
                />

                <Input
                    type="email"
                    {...register('email')}
                    placeholder={t('email')}
                    label={t('email')}
                    error={errors.email?.message}
                    required
                />

                <Input
                    type="password"
                    {...register('password')}
                    placeholder={t('password') ?? 'Contraseña'}
                    label={t('password') ?? 'Contraseña'}
                    error={errors.password?.message}
                    required
                />

                <Input
                    type="password"
                    {...register('confirm_password')}
                    placeholder={t('password_confirm') ?? 'Confirmar contraseña'}
                    label={t('password_confirm') ?? 'Confirmar contraseña'}
                    error={errors.confirm_password?.message}
                    required
                />

                {/* Idioma */}
                <Select
                    {...register('locale')}
                    label={t('idioma') ?? 'Idioma'}
                    name="locale"
                    options={locales.map(l => ({
                        value: l.code,
                        label: l.label,
                        disabled: l.disabled,
                    }))}
                    value={watch('locale') ?? ''}
                    onChange={e => setValue('locale', e.target.value)}
                    error={errors.locale?.message}
                    required={false}
                />
        
                {/* RGPD */}
                <div className="space-y-2 mt-6 text-sm text-gray-700">
                    <Checkbox
                        {...register('accepted_terms')}
                        checked={watch('accepted_terms')}
                        onChange={(e: any) => setValue('accepted_terms', e.target.checked, { shouldValidate: true })}
                        required
                        label={
                          <>
                            {t('acepta_rgpd_1')}{' '}
                            <Link href="/legal/terminos" className="text-green-600 underline">
                              {t('terminos_condiciones')}
                            </Link>{' '}
                            {t('acepta_rgpd_2')}{' '}
                            <Link href="/legal/privacidad" className="text-green-600 underline">
                              {t('politica_privacidad')}
                            </Link>
                            .
                          </>
                        }
                        error={errors.accepted_terms?.message}
                    />

                      {/* <Checkbox
                        {...register('accepted_marketing')}
                        checked={watch('accepted_marketing')}
                        onChange={(e: any) => setValue('accepted_marketing', e.target.checked)}
                        label={<>{t('acepta_comunicaciones')}</>}
                      /> */}
                </div>
                <br/>

                <Submit
                    loading={submitting}
                    text={t('cuenta_crear')}
                    loadingText={t('procesando') ?? 'Creando cuenta…'}
                />
            </form>
        </div>
    );
}
