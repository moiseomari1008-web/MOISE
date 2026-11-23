import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ChevronLeft, ChevronRight, Image as ImageIcon, Pause, Play, RotateCcw } from 'lucide-react';

export interface ShowcaseSlide {
  id: string;
  url: string;
  alt: string;
  tag?: string;
  caption: string;
}

export const Reveal: React.FC<{
  children: React.ReactNode;
  className?: string;
  delay?: number;
}> = ({ children, className = '', delay = 0 }) => {
  const prefersReduced = useReducedMotion();
  if (prefersReduced) {
    return <div className={className}>{children}</div>;
  }
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.12 }}
      transition={{ duration: 0.45, delay, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

export const PhotoFrame: React.FC<{
  src?: string;
  alt: string;
  className?: string;
  imgClassName?: string;
  aspectClass?: string;
  priority?: boolean;
  caption?: string;
}> = ({ src, alt, className = '', imgClassName = '', aspectClass = 'aspect-[16/10]', priority = false, caption }) => {
  const [failed, setFailed] = useState(false);
  const prefersReduced = useReducedMotion();

  return (
    <figure className={`group relative overflow-hidden bg-slate-100 ${aspectClass} ${className}`}>
      {src && !failed ? (
        <motion.img
          src={src}
          alt={alt}
          loading={priority ? 'eager' : 'lazy'}
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          whileHover={prefersReduced ? undefined : { scale: 1.03 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className={`h-full w-full object-cover ${imgClassName}`}
        />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 p-6 text-center text-slate-500">
          <ImageIcon className="mb-2 h-8 w-8 text-slate-400" />
          <span className="text-xs font-medium">{alt}</span>
        </div>
      )}
      {caption && (
        <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/80 via-slate-950/40 to-transparent px-4 py-3 text-xs font-medium text-white">
          {caption}
        </figcaption>
      )}
    </figure>
  );
};

export const AnimatedPhotoShowcase: React.FC<{
  slides: ShowcaseSlide[];
  aspectClass?: string;
  className?: string;
  intervalMs?: number;
  priority?: boolean;
}> = ({ slides, aspectClass = 'aspect-[16/10]', className = '', intervalMs = 5000, priority = false }) => {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [failedMap, setFailedMap] = useState<Record<string, boolean>>({});
  const prefersReduced = useReducedMotion();

  const total = slides.length;
  const safeIndex = total > 0 ? index % total : 0;
  const current = slides[safeIndex];

  useEffect(() => {
    if (total <= 1 || paused || prefersReduced) return;
    const timer = window.setInterval(() => {
      setIndex((i) => (i + 1) % total);
    }, intervalMs);
    return () => window.clearInterval(timer);
  }, [total, paused, prefersReduced, intervalMs]);

  if (!current) return null;

  const goPrev = () => setIndex((i) => (i - 1 + total) % total);
  const goNext = () => setIndex((i) => (i + 1) % total);

  return (
    <figure
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      className={`group relative overflow-hidden bg-slate-900 ${aspectClass} ${className}`}
    >
      <AnimatePresence mode="sync">
        <motion.div
          key={current.id}
          initial={prefersReduced ? { opacity: 1 } : { opacity: 0, scale: 1.05 }}
          animate={prefersReduced ? { opacity: 1 } : { opacity: 1, scale: 1.0 }}
          exit={prefersReduced ? { opacity: 0 } : { opacity: 0 }}
          transition={{ duration: 0.85, ease: [0.16, 1, 0.3, 1] }}
          className="absolute inset-0"
        >
          {current.url && !failedMap[current.id] ? (
            <motion.img
              src={current.url}
              alt={current.alt}
              loading={priority ? 'eager' : 'lazy'}
              referrerPolicy="no-referrer"
              onError={() => setFailedMap((m) => ({ ...m, [current.id]: true }))}
              animate={prefersReduced ? undefined : { scale: [1, 1.045] }}
              transition={prefersReduced ? undefined : { duration: intervalMs / 1000 + 0.6, ease: 'linear' }}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center bg-slate-100 p-6 text-center text-slate-500">
              <ImageIcon className="mb-2 h-8 w-8 text-slate-400" />
              <span className="text-xs font-medium">{current.alt}</span>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Contrast scrim + caption + square controls */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/85 via-black/45 to-transparent px-4 pt-12 pb-3.5 sm:px-5">
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0 flex-1">
            {current.tag && (
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#FBBF24]">
                {current.tag}
              </p>
            )}
            <p className="mt-0.5 text-xs font-medium text-white sm:text-sm line-clamp-2">
              {current.caption}
            </p>
          </div>

          {total > 1 && (
            <div className="pointer-events-auto flex shrink-0 items-center gap-1.5">
              <button
                type="button"
                onClick={goPrev}
                aria-label="Photo précédente"
                className="flex h-9 w-9 items-center justify-center rounded-md border border-white/25 bg-black/45 text-white transition-colors hover:border-[#FBBF24] hover:bg-[#D90A14]"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={goNext}
                aria-label="Photo suivante"
                className="flex h-9 w-9 items-center justify-center rounded-md border border-white/25 bg-black/45 text-white transition-colors hover:border-[#FBBF24] hover:bg-[#D90A14]"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        {total > 1 && (
          <div className="pointer-events-auto mt-2.5 flex items-center gap-1.5">
            {slides.map((s, idx) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setIndex(idx)}
                aria-label={`Afficher photo ${idx + 1}`}
                className={`h-1 flex-1 rounded-sm transition-all ${
                  idx === safeIndex ? 'bg-[#FBBF24]' : 'bg-white/30 hover:bg-white/60'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </figure>
  );
};

export const Product3DShowcase: React.FC<{
  src?: string;
  alt: string;
  brand?: string;
  badgeText?: string;
  aspectClass?: string;
  className?: string;
  priority?: boolean;
}> = ({ src, alt, brand, badgeText, aspectClass = 'aspect-[4/3]', className = '', priority = false }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const prefersReduced = useReducedMotion();
  const [failed, setFailed] = useState(false);
  const [autoRotate, setAutoRotate] = useState(true);
  const [interacting, setInteracting] = useState(false);
  const [tilt, setTilt] = useState({ rx: 3, ry: -6, floatY: 0, glareX: 38, glareY: 28 });

  useEffect(() => {
    setFailed(false);
  }, [src]);

  useEffect(() => {
    if (prefersReduced || interacting || !autoRotate) return;
    let rafId = 0;
    const start = performance.now();

    const loop = (now: number) => {
      const elapsed = (now - start) / 1000;
      const ry = Math.sin(elapsed * 1.05) * 9.5;
      const rx = Math.cos(elapsed * 0.85) * 4.5;
      const floatY = Math.sin(elapsed * 1.5) * 5;
      const glareX = 50 + Math.sin(elapsed * 1.05) * 24;
      const glareY = 38 + Math.cos(elapsed * 0.85) * 16;
      setTilt({ rx, ry, floatY, glareX, glareY });
      rafId = window.requestAnimationFrame(loop);
    };

    rafId = window.requestAnimationFrame(loop);
    return () => window.cancelAnimationFrame(rafId);
  }, [prefersReduced, interacting, autoRotate]);

  const updatePointerTilt = (clientX: number, clientY: number) => {
    const el = containerRef.current;
    if (!el || prefersReduced) return;
    const rect = el.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const nx = Math.max(-1, Math.min(1, ((clientX - rect.left) / rect.width) * 2 - 1));
    const ny = Math.max(-1, Math.min(1, ((clientY - rect.top) / rect.height) * 2 - 1));
    setTilt({
      rx: -ny * 13,
      ry: nx * 16,
      floatY: -4,
      glareX: 50 + nx * 35,
      glareY: 50 + ny * 35,
    });
  };

  const resetAngle = () => {
    setInteracting(false);
    setTilt({ rx: 0, ry: 0, floatY: 0, glareX: 50, glareY: 35 });
  };

  return (
    <figure
      ref={containerRef}
      onPointerEnter={() => setInteracting(true)}
      onPointerMove={(e) => {
        if (!interacting) setInteracting(true);
        updatePointerTilt(e.clientX, e.clientY);
      }}
      onPointerLeave={() => setInteracting(false)}
      onTouchMove={(e) => {
        if (e.touches[0]) {
          setInteracting(true);
          updatePointerTilt(e.touches[0].clientX, e.touches[0].clientY);
        }
      }}
      onTouchEnd={() => setInteracting(false)}
      style={{ perspective: '1250px' }}
      className={`group relative select-none overflow-hidden bg-gradient-to-br from-[#FFFDF5] via-white to-[#FEF3C7]/45 p-4 sm:p-7 ${aspectClass} ${className}`}
    >
      {/* Subtle 3D Studio Backdrop Grid Glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(251,191,36,0.16),transparent_65%)]"
      />

      {/* 3D Floating Shadow Plane */}
      <div
        aria-hidden="true"
        style={{
          transform: prefersReduced
            ? undefined
            : `translate3d(${tilt.ry * 0.7}px, ${14 + Math.abs(tilt.rx) * 0.35}px, 0) scale(${interacting ? 0.94 : 0.9})`,
          transition: interacting ? 'transform 120ms ease-out' : 'transform 350ms ease-out',
        }}
        className="pointer-events-none absolute inset-x-12 bottom-6 h-10 rounded-[100%] bg-slate-900/20 blur-xl"
      />

      {/* 3D Animated Product Frame */}
      <AnimatePresence mode="wait">
        <motion.div
          key={src || alt}
          initial={prefersReduced ? { opacity: 1 } : { opacity: 0, rotateY: -22, rotateX: 9, scale: 0.9 }}
          animate={prefersReduced ? { opacity: 1 } : { opacity: 1, rotateY: 0, rotateX: 0, scale: 1 }}
          exit={prefersReduced ? { opacity: 0 } : { opacity: 0, rotateY: 16, scale: 0.94 }}
          transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
          className="relative h-full w-full"
          style={{ transformStyle: 'preserve-3d' }}
        >
          <div
            style={{
              transformStyle: 'preserve-3d',
              transform: prefersReduced
                ? undefined
                : `translate3d(0, ${tilt.floatY}px, 24px) rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg) scale(${interacting ? 1.025 : 1})`,
              transition: interacting ? 'transform 90ms ease-out' : 'transform 420ms cubic-bezier(0.16, 1, 0.3, 1)',
              boxShadow: prefersReduced
                ? undefined
                : `${-tilt.ry * 1.15}px ${18 + tilt.rx * 0.8}px 38px -12px rgba(15, 23, 42, 0.28)`,
            }}
            className="relative h-full w-full overflow-hidden rounded-xl border border-[#F4B400]/45 bg-white"
          >
            {src && !failed ? (
              <img
                src={src}
                alt={alt}
                loading={priority ? 'eager' : 'lazy'}
                referrerPolicy="no-referrer"
                draggable={false}
                onError={() => setFailed(true)}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 p-6 text-center text-slate-500">
                <ImageIcon className="mb-2 h-9 w-9 text-slate-400" />
                <span className="text-xs font-medium">{alt}</span>
              </div>
            )}

            {/* Dynamic 3D Specular Sheen */}
            {!prefersReduced && (
              <div
                aria-hidden="true"
                style={{
                  background: `radial-gradient(circle at ${tilt.glareX}% ${tilt.glareY}%, rgba(255,255,255,0.28) 0%, rgba(255,255,255,0.06) 35%, transparent 65%)`,
                }}
                className="pointer-events-none absolute inset-0 transition-opacity duration-200"
              />
            )}

            {/* Subtle top-left brand / status strip */}
            {(brand || badgeText) && (
              <div className="pointer-events-none absolute left-3 top-3 flex items-center gap-2 rounded-md border border-white/30 bg-slate-950/75 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-sm">
                {brand && <span className="text-[#FBBF24]">{brand}</span>}
                {brand && badgeText && <span aria-hidden="true">·</span>}
                {badgeText && <span>{badgeText}</span>}
              </div>
            )}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Bottom Interactive 3D Controls Bar */}
      <div className="pointer-events-none absolute inset-x-3 bottom-3 z-10 flex items-center justify-between gap-2">
        <span className="rounded-md border border-[#F4B400]/40 bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-[#78350F] shadow-sm backdrop-blur-sm">
          Vue 3D animée · Glissez pour incliner
        </span>

        {!prefersReduced && (
          <div className="pointer-events-auto flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setAutoRotate((v) => !v)}
              aria-label={autoRotate ? 'Mettre en pause l’animation 3D' : 'Relancer l’animation 3D'}
              title={autoRotate ? 'Pause rotation 3D' : 'Activer rotation 3D'}
              className="flex h-8 items-center gap-1 rounded-md border border-slate-300 bg-white/95 px-2.5 text-[11px] font-semibold text-slate-800 shadow-sm transition-colors hover:border-[#D90A14] hover:text-[#D90A14]"
            >
              {autoRotate ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
              <span className="hidden sm:inline">{autoRotate ? 'Pause 3D' : 'Animer 3D'}</span>
            </button>
            <button
              type="button"
              onClick={resetAngle}
              aria-label="Recentrer la vue 3D"
              title="Recentrer l’angle 3D"
              className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-300 bg-white/95 text-slate-700 shadow-sm transition-colors hover:border-[#D90A14] hover:text-[#D90A14]"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    </figure>
  );
};


