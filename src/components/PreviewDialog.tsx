import { useEffect, useRef, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  FileText,
  Maximize2,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import {
  formatBytes,
  formatDuration,
  hrefOf,
  hostOf,
  type CapturedItem,
} from '../lib/snapper';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { cn, IconButton, Kbd } from './ui';

interface PreviewDialogProps {
  item: CapturedItem;
  items: CapturedItem[];
  onClose: () => void;
  onNavigate: (item: CapturedItem) => void;
  onDownload: (item: CapturedItem) => void;
  onCopy: (item: CapturedItem) => void;
}

type Zoom = 'fit' | number;

export function PreviewDialog({
  item,
  items,
  onClose,
  onNavigate,
  onDownload,
  onCopy,
}: PreviewDialogProps) {
  const [zoom, setZoom] = useState<Zoom>('fit');
  const [naturalWidth, setNaturalWidth] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useFocusTrap(dialogRef);

  const index = items.findIndex((candidate) => candidate.id === item.id);
  const previous = index > 0 ? items[index - 1] : null;
  const next = index >= 0 && index < items.length - 1 ? items[index + 1] : null;

  useEffect(() => {
    setZoom('fit');
    setNaturalWidth(0);
    setLoaded(false);
    setImageFailed(false);
  }, [item.id]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    return () => previouslyFocused?.focus?.();
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      } else if (event.key === 'ArrowLeft' && previous) {
        event.preventDefault();
        onNavigate(previous);
      } else if (event.key === 'ArrowRight' && next) {
        event.preventDefault();
        onNavigate(next);
      } else if (event.key === '+' || event.key === '=') {
        event.preventDefault();
        setZoom((current) => {
          const base = current === 'fit' ? 100 : current;
          return Math.min(400, Math.round((base * 1.25) / 10) * 10);
        });
      } else if (event.key === '-') {
        event.preventDefault();
        setZoom((current) => {
          const base = current === 'fit' ? 100 : current;
          return Math.max(10, Math.round((base / 1.25) / 10) * 10);
        });
      } else if (event.key === '0') {
        event.preventDefault();
        setZoom('fit');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [next, onClose, onNavigate, previous]);

  const fullSource =
    item.format === 'pdf' ? item.previewDataUrl : item.fileUrl || item.previewDataUrl;
  const displaySource = imageFailed ? item.previewDataUrl : fullSource;
  const imageWidth = zoom === 'fit' ? 0 : Math.max(160, ((naturalWidth || 1200) * zoom) / 100);
  const displayZoom = zoom === 'fit' ? 'Ajustar' : `${zoom}%`;

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={`Pré-visualização de ${hostOf(item.url)}`}
      className="fixed inset-0 z-50 flex flex-col bg-[#04060a]/95 backdrop-blur-xl"
    >
      {/* Toolbar */}
      <div className="flex min-h-14 shrink-0 flex-wrap items-center justify-between gap-2 border-b border-white/[0.07] bg-[#070a11]/90 px-3 py-2 sm:px-5">
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            className={cn(
              'rounded border px-1.5 py-0.5 font-mono text-[10.5px] font-bold tracking-wide',
              item.format === 'pdf'
                ? 'border-rose-400/30 bg-rose-400/10 text-rose-300'
                : 'border-amber-400/30 bg-amber-400/10 text-amber-300'
            )}
          >
            {item.format.toUpperCase()}
          </span>
          <span className="max-w-[36vw] truncate font-mono text-[12.5px] text-slate-200" title={item.fileName}>
            {item.fileName}
          </span>
          <span className="hidden items-center gap-2 font-mono text-[11.5px] text-slate-400 sm:flex">
            <span className="h-3 w-px bg-white/10" />
            {item.dimensions?.pageWidth} × {item.dimensions?.pageHeight} px
            <span className="text-slate-700">·</span>
            {formatBytes(item.byteSize)}
            <span className="text-slate-700">·</span>
            {formatDuration(item.durationMs)}
          </span>
        </div>

        <div className="ml-auto flex items-center gap-1.5">
          <div className="flex items-center rounded-lg border border-white/[0.08] bg-white/[0.03] p-0.5">
            <IconButton
              label="Diminuir zoom"
              onClick={() =>
                setZoom((current) => {
                  const base = current === 'fit' ? 100 : current;
                  return Math.max(10, Math.round((base / 1.25) / 10) * 10);
                })
              }
              className="h-7 w-7 text-slate-400"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </IconButton>
            <button
              type="button"
              onClick={() => setZoom('fit')}
              className="min-w-14 px-1 text-center font-mono text-[12px] text-slate-300 transition-colors hover:text-white"
              title="Ajustar à tela (0)"
            >
              {displayZoom}
            </button>
            <IconButton
              label="Aumentar zoom"
              onClick={() =>
                setZoom((current) => {
                  const base = current === 'fit' ? 100 : current;
                  return Math.min(400, Math.round((base * 1.25) / 10) * 10);
                })
              }
              className="h-7 w-7 text-slate-400"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </IconButton>
            <span className="mx-0.5 h-4 w-px bg-white/10" />
            <IconButton
              label="Tamanho real"
              onClick={() => setZoom(100)}
              className="h-7 w-7 text-slate-400"
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </IconButton>
          </div>

          {item.format !== 'pdf' && (
            <button
              type="button"
              onClick={() => onCopy(item)}
              className="btn btn-ghost btn-sm hidden text-slate-400 hover:text-white sm:inline-flex"
              title="Copiar imagem"
            >
              <Copy className="h-3.5 w-3.5" />
              <span className="hidden lg:inline">Copiar</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => onDownload(item)}
            className="btn btn-primary btn-sm"
          >
            {item.format === 'pdf' ? (
              <FileText className="h-3.5 w-3.5" />
            ) : (
              <Download className="h-3.5 w-3.5" />
            )}
            <span className="hidden sm:inline">Baixar {item.format.toUpperCase()}</span>
            <span className="sm:hidden">Baixar</span>
          </button>

          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Fechar pré-visualização"
            className="btn btn-ghost btn-icon text-slate-400 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div className="relative flex-1 overflow-auto bg-[#04060a] p-4 sm:p-6">
        {previous && (
          <button
            type="button"
            onClick={() => onNavigate(previous)}
            aria-label="Captura anterior"
            className="fixed left-3 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-black/55 text-slate-300 backdrop-blur transition-colors hover:border-amber-400/30 hover:text-white"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}
        {next && (
          <button
            type="button"
            onClick={() => onNavigate(next)}
            aria-label="Próxima captura"
            className="fixed right-3 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-black/55 text-slate-300 backdrop-blur transition-colors hover:border-amber-400/30 hover:text-white"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        )}

        <div
          className="mx-auto"
          style={
            zoom === 'fit'
              ? { maxWidth: 1280, width: '100%' }
              : { width: `${imageWidth}px`, maxWidth: 'none' }
          }
        >
          <div className="relative overflow-hidden rounded-xl border border-white/10 bg-[#0b0f17] shadow-2xl shadow-black/60">
            {!loaded && (
              <div className="absolute inset-0 min-h-[240px] animate-pulse bg-white/[0.03]" />
            )}
            <img
              src={displaySource}
              alt={`Captura de ${hostOf(item.url)}`}
              onError={() => setImageFailed(true)}
              onLoad={(event) => {
                setNaturalWidth(event.currentTarget.naturalWidth);
                setLoaded(true);
              }}
              className={cn(
                'block h-auto w-full transition-opacity duration-200',
                loaded ? 'opacity-100' : 'opacity-0'
              )}
            />
          </div>
          {item.format === 'pdf' && (
            <p className="mt-2 flex items-center justify-center gap-1.5 text-center text-[11.5px] text-slate-400">
              <FileText className="h-3 w-3 text-rose-400/80" />
              Prévia da viewport — o PDF vetorial contínuo é gerado no download.
            </p>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="flex min-h-10 shrink-0 items-center justify-between gap-3 border-t border-white/[0.06] bg-[#070a11] px-3 text-[11.5px] text-slate-400 sm:px-5">
        <a
          href={hrefOf(item.url)}
          target="_blank"
          rel="noreferrer"
          className="truncate font-mono transition-colors hover:text-slate-300"
          title={item.url}
        >
          {item.url}
        </a>
        <span className="hidden shrink-0 items-center gap-2 md:flex">
          <span className="flex items-center gap-1">
            <Kbd>←</Kbd>
            <Kbd>→</Kbd>
            navegar
          </span>
          <span className="flex items-center gap-1">
            <Kbd>+</Kbd>
            <Kbd>−</Kbd>
            zoom
          </span>
          <span className="flex items-center gap-1">
            <Kbd>Esc</Kbd>
            fechar
          </span>
          {index >= 0 && (
            <span className="font-mono text-slate-400">
              {index + 1} / {items.length}
            </span>
          )}
        </span>
      </div>
    </div>
  );
}
