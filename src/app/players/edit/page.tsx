'use client';
import { useState, ChangeEvent } from 'react';
import { useT } from '@/i18n/I18nProvider';

// Components
import Input from '../../../components/Input';
import Select from '../../../components/Select';
import Submit from '../../../components/Submit';
import TitleH1 from '../../../components/TitleH1';

type Sport = { id: string; name: string; slug: string; active?: boolean | null };
type Category = { id: string; name: string; sport_id: string };

type MembershipBlock = {
    sportId: string;
    clubName: string;
    teamName: string;
    categoryIds: string[];
    avatarFile?: File | null;
    avatarPath?: string | null; // ruta local calculada
};

export default function EditPlayerPage() {
    const t = useT();

    // Estados mínimos necesarios para evitar errores de typescript/lint
    const [info, setInfo] = useState<string | null>(null);
    const [err, setErr] = useState<string | null>(null);
    const [name, setName] = useState<string>('');
    const [busy] = useState(false);
    const [sports] = useState<Sport[]>([]);
    const [categoriesBySport] = useState<Record<string, Category[]>>({});
    const [blocks, setBlocks] = useState<MembershipBlock[]>([
        { sportId: '', clubName: '', teamName: '', categoryIds: [], avatarFile: null, avatarPath: null },
    ]);

    const MAX_BLOCKS = 5;

    const setBlock = <K extends keyof MembershipBlock>(i: number, key: K, value: MembershipBlock[K]) => {
        setBlocks((prev) => {
            const copy = [...prev];
            copy[i] = { ...copy[i], [key]: value } as MembershipBlock;
            return copy;
        });
    };

    const removeBlock = (idx: number) => setBlocks((b) => b.filter((_, i) => i !== idx));
    const addBlock = () => setBlocks((b) => (b.length >= MAX_BLOCKS ? b : [...b, { sportId: '', clubName: '', teamName: '', categoryIds: [], avatarFile: null, avatarPath: null }]));

    const createOne = async (e: React.FormEvent) => {
        e.preventDefault();
        // Placeholder: no-op to avoid type errors; real implementation lives elsewhere.
        setErr(null);
        setInfo(null);
    };

    return (
        <div className="max-w-xl mx-auto">
            <TitleH1>{t('editar')}</TitleH1>

            {/* Info/errores */}
            {info && <div className="rounded border p-3 bg-green-50 text-green-700 mb-4">{info}</div>}
            {err && <div className="rounded border p-3 bg-red-50 text-red-700 mb-4">{err}</div>}
    
            <form onSubmit={createOne} className="space-y-4">
                <Input 
                    value={name} 
                    onChange={(e:any)=>setName(e.target.value)} 
                    label={t('deportista_nombre')}
                    placeholder={t('nombre')} 
                />

                {/* 2–7) Bloques replicables */}
                <div className="space-y-6">
                    {blocks.map((b, i) => {
                        const sportCats = b.sportId ? categoriesBySport[b.sportId] || [] : [];
                        return (
                            <div key={i} className="p-4 bg-gray-100 space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="font-medium">{t('participacion')} #{i + 1}</div>
                                    {blocks.length > 1 && (
                                        <button
                                          type="button"
                                          onClick={() => removeBlock(i)}
                                          className="text-sm text-red-600 hover:underline"
                                        >
                                            {t('eliminar')}
                                        </button>
                                    )}
                                </div>

                                {/* Deporte */}
                                <div>
                                    <label className="text-sm font-medium">{t('deporte')}</label>
                                    <Select
                                        name={`sport_${i}`}
                                        value={b.sportId}
                                        onChange={(e: ChangeEvent<HTMLSelectElement>) => setBlock(i, 'sportId', e.target.value)}
                                        options={sports.map((s) => ({ value: s.id, label: s.name }))}
                                        placeholder={t('deporte_selec')}
                                        fontSize="sm"
                                    />
                                </div>

                                {/* Categoría */}
                                <div>
                                    <Select
                                        name={`categoryIds_${i}`}
                                        label={t('categoria')}
                                        value={b.categoryIds}
                                        onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                                            setBlock(
                                                i,
                                                'categoryIds',
                                                Array.from(e.target.selectedOptions).map((o) => o.value)
                                            )
                                        }
                                        options={sportCats.map((c) => ({ value: c.id, label: c.name }))}
                                        placeholder={sportCats.length === 0 ? t('deporte_selec_primero') : t('categoria_selec') }
                                        fontSize="sm"
                                    />
                                </div>

                                {/* Club */}
                                <Input
                                    value={b.clubName}
                                    onChange={(e: any) => setBlock(i, 'clubName', e.target.value)}
                                    label="Club"
                                    placeholder={t('club_nombre')}
                                />

                                {/* Equipo */}
                                <Input
                                    value={b.teamName}
                                    onChange={(e: any) => setBlock(i, 'teamName', e.target.value)}
                                    label={t('equipo')}
                                    placeholder={t('equipo_nombre')}
                                />

                                {/* 2) Avatar por temporada */}
                                <div>
                                    <label className="text-sm font-medium block mb-1 text-gray-700">{t('avatar')} <small>({t('avatar_temporada')})</small></label>
                                    <label className="flex items-center justify-center border-2 border-dashed rounded-lg p-6 bg-white cursor-pointer hover:bg-gray-100">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={(e) => {
                                                const f = e.target.files?.[0] || null;
                                                setBlock(i, 'avatarFile', f);
                                            }}
                                        />
                                        <div className="text-center">
                                            <div className="text-sm">
                                                {b.avatarFile ? `Seleccionado: ${b.avatarFile.name}` : t('imagen_selec')}
                                            </div>
                                            <div className="text-xs text-gray-500">Se guarda en el dispositivo. No se sube a la nube.</div>
                                        </div>
                                    </label>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={addBlock}
                        className="px-3 py-2 rounded bg-white border hover:bg-gray-50 text-sm"
                    >
                        + {t('participacion_add')}
                    </button>

                    <Submit
                        text={t('guardar')}
                        loadingText={t('procesando') ?? t('guardar')}
                        disabled={busy}
                    />
                </div>
            </form>
        </div>
    );
}