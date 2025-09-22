'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

import { supabase } from '@/lib/supabase/client';
import { useT, useLocale } from '@/i18n/I18nProvider'; // ajusta la ruta si difiere en tu proyecto

// Components (mismos que en Registro)
import Input from '@/components/Input';
import Select from '@/components/Select';
import Submit from '@/components/Submit';
import TitleH1 from '@/components/TitleH1';

// Validation
import { z } from 'zod';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

type TabKey = 'profile' | 'password';

type UserRow = {
    id: string;
    name: string | null;
    surname: string | null;
    email: string | null;
    phone: string | null;
    locale: string | null;
};

// ----------------------- Schemas -----------------------
const profileSchema = z.object({
    name: z.string().min(2, 'Mínimo 2 caracteres').optional().or(z.literal('')),
    surname: z.string().min(2, 'Mínimo 2 caracteres').optional().or(z.literal('')),
    email: z.string().email('Email no válido'),
    phone: z.string().optional().or(z.literal('')),
    locale: z.string().length(2, 'Código de idioma de 2 letras'),
});
type ProfileForm = z.infer<typeof profileSchema>;

const passwordSchema = z.object({
    new_password: z.string().min(8, 'Mínimo 8 caracteres'),
    confirm_password: z.string().min(8, 'Mínimo 8 caracteres'),
}).refine(d => d.new_password === d.confirm_password, {
    message: 'Las contraseñas no coinciden',
    path: ['confirm_password'],
});
type PasswordForm = z.infer<typeof passwordSchema>;

// ----------------------- Page -----------------------
export default function AccountEditPage() {
    const t = useT();
    const router = useRouter();
    const { locale, setLocale, locales } = useLocale();

    const [tab, setTab] = useState<TabKey>('profile');
    const [initialEmail, setInitialEmail] = useState('');
    const [authUserId, setAuthUserId] = useState<string | null>(null);
    const [loadingUser, setLoadingUser] = useState(true);

    const [profileMsg, setProfileMsg] = useState<string | null>(null);
    const [profileErr, setProfileErr] = useState<string | null>(null);
    const [pwdMsg, setPwdMsg] = useState<string | null>(null);
    const [pwdErr, setPwdErr] = useState<string | null>(null);

    // Normaliza locales como en Registro
    const localeOptions = useMemo(() => {
        const arr = Array.isArray(locales) ? locales : [];
        return arr.map((l: any) => ({
            value: l.code ?? l.value ?? l.locale ?? '',
            label: l.label ?? String(l.code ?? '').toUpperCase(),
            disabled: !!l.disabled,
        }));
    }, [locales]);

    // react-hook-form: Perfil
    const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting: submittingProfile },
    watch,
    setValue,
    } = useForm<ProfileForm>({
        resolver: zodResolver(profileSchema),
        defaultValues: {
          name: '',
          surname: '',
          email: '',
          phone: '',
          locale: (typeof navigator !== 'undefined' ? (navigator.language || 'es').slice(0,2) : 'es'),
        },
    });

    // react-hook-form: Password
    const {
        register: registerPwd,
        handleSubmit: handleSubmitPwd,
        reset: resetPwd,
        formState: { errors: errorsPwd, isSubmitting: submittingPwd },
        watch: watchPwd,
    } = useForm<PasswordForm>({
        resolver: zodResolver(passwordSchema),
        defaultValues: { new_password: '', confirm_password: '' },
    });

    const watchLocale = watch('locale');
    const watchNewPwd = watchPwd('new_password');

    // Carga inicial: Auth + public.users
    useEffect(() => {
        let active = true;
        (async () => {
            const { data: authRes, error: authErr } = await supabase.auth.getUser();
            if (!active) return;
            if (authErr || !authRes.user) {
                router.replace('/login');
                return;
            }
            const u = authRes.user;
            setAuthUserId(u.id);

            const { data: row } = await supabase
                .from('users')
                .select('id, name, surname, email, phone, locale')
                .eq('id', u.id)
                .maybeSingle<UserRow>();

            const next: ProfileForm = {
                name: String(row?.name ?? ''),
                surname: String(row?.surname ?? ''),
                email: String(row?.email ?? u.email ?? ''),
                phone: String(row?.phone ?? ''),
                locale: String(row?.locale ?? (typeof navigator !== 'undefined' ? (navigator.language || 'es').slice(0,2) : 'es'))
                  .slice(0,2).toLowerCase(),
            };

            setInitialEmail(next.email);
            reset(next);
            setLoadingUser(false);
        })();
        return () => { active = false; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // --------- Guardar Perfil ----------
    const onSubmitProfile = handleSubmit(async (values) => {
    setProfileErr(null);
    setProfileMsg(null);
    if (!authUserId) return;

    const nextEmail = values.email.trim();
    const wantsEmailChange = nextEmail && nextEmail !== initialEmail.trim();

    // 1) Cambiar email en Auth si procede (deja que Auth valide unicidad)
    if (wantsEmailChange) {
        const { error: authUpdErr, data: updData } = await supabase.auth.updateUser({ email: nextEmail });
        if (authUpdErr) {
            setProfileErr(authUpdErr.message || 'No se pudo actualizar el email en Auth.');
            return;
        }
        setInitialEmail(updData?.user?.email || nextEmail);
    }

    // 2) Guardar en tabla users con upsert (POST) para evitar problemas de CORS por PATCH
    const { error: rowUpdErr } = await supabase
      .from('users')
      .upsert({
        id: authUserId,
        name: values.name || null,
        surname: values.surname || null,
        phone: values.phone || null,
        locale: values.locale || null,
        email: nextEmail || null,
      }, { onConflict: 'id' });

        if (rowUpdErr) {
            setProfileErr(rowUpdErr.message || 'No se pudo guardar en la tabla de usuarios.');
            return;
        }

        // 3) Sincroniza el contexto de idioma si cambió
        if (values.locale && values.locale !== locale) setLocale(values.locale);

        setProfileMsg(
            wantsEmailChange
            ? t('perfil_guardado_confirma_email') ?? 'Perfil guardado. Revisa tu correo para confirmar el cambio de email.'
            : t('perfil_actualizado_ok') ?? 'Perfil guardado correctamente.'
        );
    });

    // --------- Guardar Contraseña ----------
    const onSubmitPassword = handleSubmitPwd(async (values) => {
        setPwdErr(null);
        setPwdMsg(null);

        const { error } = await supabase.auth.updateUser({ password: values.new_password });
        if (error) {
            setPwdErr(error.message || 'No se pudo actualizar la contraseña.');
            return;
        }

        setPwdMsg(t('contrasena_actualizada') ?? 'Contraseña actualizada.');
        resetPwd({ new_password: '', confirm_password: '' });
    });

    if (loadingUser) {
        return (
            <div className="mx-auto max-w-2xl p-4">
                <div className="animate-pulse rounded-lg border p-6">
                    <div className="mb-4 h-6 w-40 rounded bg-gray-200" />
                    <div className="mb-2 h-4 w-full rounded bg-gray-100" />
                    <div className="mb-2 h-4 w-5/6 rounded bg-gray-100" />
                    <div className="mb-2 h-4 w-3/4 rounded bg-gray-100" />
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-xl mx-auto">
            <TitleH1>{t('perfil_editar')}</TitleH1>

            {/* Tabs */}
            <div className="mb-6 flex gap-2">
                <Link href="/account">
                    <button className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold px-3 py-2 rounded-lg shadow transition">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                            <path d="M15 18L9 12L15 6" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                        <span>{t('cuenta_mi_volver')}</span>
                    </button>
                </Link>

                <button
                    type="button"
                    onClick={() => setTab('profile')}
                    className={`font-semibold px-3 py-2 rounded-lg transition ${
                        tab === 'profile'
                          ? 'bg-green-600 hover:bg-green-700 text-white shadow'
                          : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 shadow-sm'
                    }`}
                >
                    {t('perfil')}
                </button>
                
                <button
                    type="button"
                    onClick={() => setTab('password')}
                    className={`font-semibold px-3 py-2 rounded-lg transition ${
                        tab === 'password'
                          ? 'bg-green-600 hover:bg-green-700 text-white shadow'
                          : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 shadow-sm'
                    }`}
                >
                    {t('contrasena')}
                </button>
            </div>

            {/*Panels*/}
            {tab === 'profile' ? (
                <form onSubmit={onSubmitProfile} className="space-y-4">
                    {profileErr && (
                        <div className="mb-2 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">
                            {profileErr}
                        </div>
                    )}
                    {profileMsg && (
                        <div className="mb-2 rounded-md border border-green-300 bg-green-50 p-3 text-sm text-green-700">
                            {profileMsg}
                        </div>
                    )}

                    <Input
                        type="text"
                        {...register('name')}
                        placeholder={t('nombre')}
                        label={t('nombre')}
                        maxLength={50}
                        error={errors.name?.message}
                        required
                    />
              
                    <Input
                        type="text"
                        {...register('surname')}
                        placeholder={t('apellidos')}
                        label={t('apellidos')}
                        maxLength={100}
                        error={errors.surname?.message}
                        required
                    />
          
                    <Input
                        type="email"
                        {...register('email')}
                        placeholder={t('email')}
                        label={t('email')}
                        maxLength={80}
                        error={errors.email?.message}
                        required
                    />

                    <Input
                        type="tel"
                        {...register('phone')}
                        placeholder={t('telf') ?? 'Teléfono'}
                        label={t('telf') ?? 'Teléfono'}
                        maxLength={15}
                        error={errors.phone?.message}
                    />

                    <Controller
                        control={control}
                        name="locale"
                        render={({ field }) => (
                            <Select
                                {...field}
                                label={t('idioma') ?? 'Idioma'}
                                name="locale"
                                options={localeOptions}
                                value={watchLocale ?? ''}
                                onChange={(e) => field.onChange(e.target.value)}
                                error={errors.locale?.message}
                                required={false}
                                placeholder={t('idioma_selec') ?? 'Selecciona una opción'}
                            />
                        )}
                    />
                    <br/>

                    <Submit
                        loading={submittingProfile}
                        text={t('guardar') ?? 'Guardar cambios'}
                        loadingText={t('procesando') ?? 'Guardando…'}
                    />
                </form>
            
            ) : (
                <form onSubmit={onSubmitPassword} className="space-y-4">
                    {pwdErr && (
                        <div className="mb-2 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">
                            {pwdErr}
                        </div>
                    )}
                    {pwdMsg && (
                        <div className="mb-2 rounded-md border border-green-300 bg-green-50 p-3 text-sm text-green-700">
                            {pwdMsg}
                        </div>
                    )}

                    <Input
                        type="password"
                        {...registerPwd('new_password')}
                        placeholder={t('contrasena_nueva') ?? 'Nueva contraseña'}
                        label={t('contrasena_nueva') ?? 'Nueva contraseña'}
                        error={errorsPwd.new_password?.message}
                        required
                    />

                    <Input
                        type="password"
                        {...registerPwd('confirm_password')}
                        placeholder={t('password_confirm') ?? 'Confirmar contraseña'}
                        label={t('password_confirm') ?? 'Confirmar contraseña'}
                        error={errorsPwd.confirm_password?.message}
                        required
                    />
                    <br/>

                    <Submit
                        loading={submittingPwd}
                        text={t('actualizar') ?? 'Actualizar contraseña'}
                        loadingText={t('procesando') ?? 'Actualizando…'}
                    />
                </form>
            )}
        </div>
    );
}
