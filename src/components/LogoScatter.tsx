'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';

type PlacedIcon = {
  src: string;
  x: number; // px desde la izquierda
  y: number; // px desde arriba
  w: number; // ancho px
  h: number; // alto px
  rotate: number; // grados
};

type Props = {
  /** Lista de rutas a /public/icons/*.png (o .svg/.webp). */
  icons: string[];
  /** Cuántos iconos pintar como máximo. Default: 4 o tantos como haya disponibles. */
  count?: number;
  /** Tamaño aleatorio de los iconos en px [min, max]. Default: [56, 96]. */
  sizeRangePx?: [number, number];
  /** Separación mínima entre iconos en centímetros. Default: 0.5 cm. */
  minDistanceCm?: number;
  /** Rotación aleatoria en grados. Default: true para -15..15. */
  randomRotation?: boolean;
  /** z-index para las pegatinas. */
  zIndex?: number;
  /** Permite recalcular en resize. Default: true */
  recomputeOnResize?: boolean;
  /** Clase extra para el contenedor. */
  className?: string;
  /** El logo o cualquier contenido que actúe como “fondo”. */
  children: React.ReactNode;
};

export default function LogoScatter({
  icons,
  count,
  sizeRangePx = [56, 96],
  minDistanceCm = 0.5,
  randomRotation = true,
  zIndex = 2,
  recomputeOnResize = true,
  className,
  children,
}: Props) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [placed, setPlaced] = useState<PlacedIcon[]>([]);

  // toma sin repetición
  const pickUnique = useMemo(() => {
    const shuffled = [...icons].sort(() => Math.random() - 0.5);
    const max = Math.min(count ?? 4, shuffled.length);
    return shuffled.slice(0, max);
  }, [icons, count]);

  // convierte cm reales aproximados a px del dispositivo actual
  function cmToPx(cm: number) {
    // método robusto: medir un div de ancho cm
    const el = document.createElement('div');
    el.style.width = `${cm}cm`;
    el.style.position = 'absolute';
    el.style.visibility = 'hidden';
    document.body.appendChild(el);
    const px = el.getBoundingClientRect().width;
    el.remove();
    return px;
  }

  function rectsOverlap(a: PlacedIcon, b: PlacedIcon, padding: number) {
    const ax1 = a.x - padding;
    const ay1 = a.y - padding;
    const ax2 = a.x + a.w + padding;
    const ay2 = a.y + a.h + padding;

    const bx1 = b.x - padding;
    const by1 = b.y - padding;
    const bx2 = b.x + b.w + padding;
    const by2 = b.y + b.h + padding;

    // si se solapan, retorna true
    return !(ax2 < bx1 || bx2 < ax1 || ay2 < by1 || by2 < ay1);
  }

  function randomBetween(min: number, max: number) {
    return Math.floor(min + Math.random() * (max - min + 1));
  }

  // calcula colocación
  function recompute() {
    const parent = wrapperRef.current;
    if (!parent) return;

    const padPx = cmToPx(minDistanceCm); // separación mínima borde a borde
    const { width: W, height: H } = parent.getBoundingClientRect();
    if (!W || !H) return;

    const results: PlacedIcon[] = [];
    const maxAttemptsPerIcon = 80;

    for (const src of pickUnique) {
      const w = randomBetween(sizeRangePx[0], sizeRangePx[1]);
      const h = w; // asumimos cuadrado; si no lo es, no pasa nada grave
      let placedOk = false;

      for (let attempt = 0; attempt < maxAttemptsPerIcon; attempt++) {
        const x = Math.max(0, Math.floor(Math.random() * (W - w)));
        const y = Math.max(0, Math.floor(Math.random() * (H - h)));

        const candidate: PlacedIcon = {
          src,
          x,
          y,
          w,
          h,
          rotate: randomRotation ? randomBetween(-15, 15) : 0,
        };

        // comprobar solapes
        let collision = false;
        for (const prev of results) {
          if (rectsOverlap(candidate, prev, padPx)) {
            collision = true;
            break;
          }
        }
        if (!collision) {
          results.push(candidate);
          placedOk = true;
          break;
        }
      }
      // si no hubo hueco, lo ignoramos en silencio. Mejor que ponerlo mal.
      if (!placedOk) continue;
    }

    setPlaced(results);
  }

  useEffect(() => {
    recompute();
    if (!recomputeOnResize) return;

    let t = 0 as unknown as number;
    const onResize = () => {
      clearTimeout(t);
      t = window.setTimeout(recompute, 120); // debounce
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickUnique.join('|'), sizeRangePx[0], sizeRangePx[1], minDistanceCm]);

  return (
    <div
      ref={wrapperRef}
      className={['relative inline-block select-none', className].filter(Boolean).join(' ')}
      style={{ lineHeight: 0 }}
    >
      {/* Contenido base: el logo */}
      <div className="relative z-[1]">{children}</div>

        {/* Pegatinas */}
        {placed.map((p, i) => (
        <Image
            key={p.src + i}
            src={p.src}             // rutas en /public/icons/*
            alt=""
            aria-hidden="true"
            width={p.w}
            height={p.h}
            priority={false}
            style={{
            position: 'absolute',
            left: p.x,
            top: p.y,
            transform: `rotate(${p.rotate}deg)`,
            zIndex,
            pointerEvents: 'none',
            opacity: 0.88,
            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.18))',
            }}
        />
        ))}

        </div>
    );
}
