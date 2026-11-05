import { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  CircleSlash,
  Copy,
  Download,
  ExternalLink,
  FileArchive,
  FileCode,
  FileText,
  Images,
  Key,
  Keyboard,
  Layers,
  Maximize2,
  MoveVertical,
  Play,
  RefreshCw,
  ScanLine,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import {
  formatBytes,
  formatClock,
  formatDuration,
  hrefOf,
  hostOf,
  pathOf,
  stepLabel,
  type CapturedItem,
  type CaptureSettings,
  type LastRun,
  type OutputFormat,
  type RunProgress,
} from '../lib/snapper';
import { cn, IconButton, Spinner } from './ui';

export type GalleryFilter = 'all' | 'success' | 'error';

interface ResultsPanelProps {
  items: CapturedItem[];
  isRunning: boolean;
  progress: RunProgress;
  elapsedMs: number;
  lastRun: LastRun | null;
  settings: CaptureSettings;
  urlCount: number;
  filter: GalleryFilter;
  onFilterChange: (filter: GalleryFilter) => void;
  onPreview: (item: CapturedItem) => void;
  onDownload: (item: CapturedItem) => void;
  onCopy: (item: CapturedItem) => void;
  onRemove: (id: string) => void;
  onRetry: (item: CapturedItem) => void;
  onZip: () => void;
  onClear: () => void;
  onTrySample: () => void;
  onShowShortcuts: () => void;
  zipState: { active: boolean; done: number; total: number };
  clearArmed: boolean;
}

export function ResultsPanel({
  items,
  isRunning,
  progress,
  elapsedMs,
  lastRun,
  settings,
  urlCount,
  filter,
  onFilterChange,
  onPreview,
  onDownload,
  onCopy,
  onRemove,
  onRetry,
  onZip,
  onClear,
  onTrySample,
  onShowShortcuts,
  zipState,
  clearArmed,
}: ResultsPanelProps) {
  const validItems = items.filter((item) => item.dataUrl && !item.error);
  const failedItems = items.filter((item) => Boolean(item.error) || !item.dataUrl);
  const totalBytes = validItems.reduce((sum, item) => sum + (item.byteSize || 0), 0);
  const visibleItems =
    filter === 'error' ? failedItems : filter === 'success' ? validItems : items;
  const showFilter = failedItems.length > 0 && validItems.length > 0;

  return (
    <div className="min-w-0 space-y-4">
      <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {isRunning
          ? `Capturando ${Math.min(progress.finished + 1, progress.total)} de ${progress.total} links.`
          : lastRun
            ? lastRun.interrupted
              ? 'Captura interrompida.'
              : `Lote finalizado com ${lastRun.success} de ${lastRun.total} capturas.`
            : 'Aguardando capturas.'}
      </p>
      <StatusCard
        isRunning={isRunning}
        progress={progress}
        elapsedMs={elapsedMs}
        lastRun={lastRun}
        settings={settings}
        urlCount={urlCount}
        validCount={validItems.length}
      />

      <section aria-label="Galeria de capturas" className="space-y-3">
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.06] pb-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.03] text-slate-400">
              <Layers className="h-3.5 w-3.5" />
            </span>
            <h2 className="text-[13px] font-bold tracking-[-0.01em] text-white">Galeria</h2>
            <span className="chip">
              {items.length} {items.length === 1 ? 'captura' : 'capturas'}
            </span>
            {validItems.length > 0 && (
              <span className="hidden items-center gap-1.5 font-mono text-[10px] text-slate-500 sm:flex">
                <span className="h-3 w-px bg-white/10" />
                {formatBytes(totalBytes)}
              </span>
            )}
            {failedItems.length > 0 && (
              <span className="chip chip-rose">
                {failedItems.length} {failedItems.length === 1 ? 'falha' : 'falhas'}
              </span>
            )}
          </div>

          {items.length > 0 && (
            <div className="flex items-center gap-1.5">
              {showFilter && (
                <div className="mr-1 flex rounded-lg border border-white/[0.07] bg-black/25 p-0.5">
                  {(
                    [
                      { id: 'all' as const, label: 'Todas' },
                      { id: 'error' as const, label: 'Falhas' },
                    ] as const
                  ).map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => onFilterChange(option.id)}
                      aria-pressed={filter === option.id}
                      className={cn(
                        'rounded-md px-2 py-1 text-[10.5px] font-semibold transition-colors',
                        filter === option.id
                          ? 'bg-white/[0.08] text-white'
                          : 'text-slate-500 hover:text-slate-300'
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}

              <button
                type="button"
                onClick={onZip}
                disabled={validItems.length === 0 || zipState.active || isRunning}
                className="btn btn-primary btn-sm"
                title="Baixar todas as capturas em um arquivo ZIP"
              >
                {zipState.active ? (
                  <Spinner className="h-3.5 w-3.5" />
                ) : (
                  <FileArchive className="h-3.5 w-3.5" />
                )}
                <span>
                  {zipState.active
                    ? `Compactando ${zipState.done}/${zipState.total}`
                    : 'Baixar .zip'}
                </span>
              </button>

              <button
                type="button"
                onClick={onClear}
                disabled={isRunning}
                className={cn(
                  'btn btn-sm',
                  clearArmed ? 'btn-danger' : 'btn-ghost text-slate-500 hover:text-rose-300'
                )}
                title="Limpar galeria"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span className={cn(clearArmed ? 'inline' : 'hidden sm:inline')}>
                  {clearArmed ? 'Confirmar' : 'Limpar'}
                </span>
              </button>
            </div>
          )}
        </header>

        {items.length === 0 && !isRunning && (
          <>
            <EmptyGallery onTrySample={onTrySample} onShowShortcuts={onShowShortcuts} />
            <EngineCapabilities />
          </>
        )}

        {items.length === 0 && isRunning && <SkeletonGallery />}

        {items.length > 0 && visibleItems.length === 0 && (
          <div className="panel flex flex-col items-center px-6 py-10 text-center">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03] text-slate-500">
              <Images className="h-4 w-4" />
            </span>
            <p className="mt-3 text-[12.5px] font-semibold text-slate-200">
              Nada neste filtro
            </p>
            <p className="mt-1 text-[11px] text-slate-500">
              Ajuste o filtro para revisar as demais capturas.
            </p>
            <button
              type="button"
              onClick={() => onFilterChange('all')}
              className="btn btn-secondary btn-sm mt-4"
            >
              Ver todas
            </button>
          </div>
        )}

        {visibleItems.length > 0 && (
          <div className="grid gap-3 xl:grid-cols-2">
            {visibleItems.map((item) => {
              const isFailed = Boolean(item.error) || !item.dataUrl;
              return isFailed ? (
                <ErrorCard
                  key={item.id}
                  item={item}
                  isRunning={isRunning}
                  onRetry={onRetry}
                  onRemove={onRemove}
                />
              ) : (
                <CaptureCard
                  key={item.id}
                  item={item}
                  onPreview={onPreview}
                  onDownload={onDownload}
                  onCopy={onCopy}
                  onRemove={onRemove}
                />
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

/* ------------------------------- Status card ------------------------------- */

function StatusCard({
  isRunning,
  progress,
  elapsedMs,
  lastRun,
  settings,
  urlCount,
  validCount,
}: {
  isRunning: boolean;
  progress: RunProgress;
  elapsedMs: number;
  lastRun: LastRun | null;
  settings: CaptureSettings;
  urlCount: number;
  validCount: number;
}) {
  if (isRunning) {
    const percent =
      progress.total > 0 ? Math.round((progress.finished / progress.total) * 100) : 0;
    const etaMs =
      progress.finished > 0 && progress.finished < progress.total
        ? (elapsedMs / progress.finished) * (progress.total - progress.finished)
        : null;
    const current = Math.min(progress.finished + 1, progress.total);

    return (
      <div className="panel overflow-hidden border-amber-400/20 px-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-amber-400/25 bg-amber-400/10">
              <Spinner className="h-4 w-4 text-amber-400" />
            </span>
            <div className="min-w-0">
              <p className="text-[12.5px] font-semibold text-white">
                Capturando {current} de {progress.total}
              </p>
              <p className="mt-0.5 truncate text-[11px] text-slate-400">
                {progress.statusText || 'Preparando o Chromium headless...'}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className="chip chip-amber hidden sm:inline-flex">
              {stepLabel(progress.step)}
            </span>
            <span className="font-mono text-[13px] font-semibold tabular-nums text-white">
              {percent}%
            </span>
          </div>
        </div>

        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
          aria-label="Progresso do lote"
          className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.09] ring-1 ring-inset ring-white/[0.04]"
        >
          <div
            className="shimmer h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500 transition-[width] duration-500"
            style={{ width: `${Math.max(percent, 2)}%` }}
          />
        </div>

        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 text-[10.5px] text-slate-500">
          <span className="flex items-center gap-2 font-mono">
            <span>{formatClock(elapsedMs)} decorridos</span>
            {etaMs !== null && (
              <>
                <span className="text-slate-700">·</span>
                <span>~{formatClock(etaMs)} restantes</span>
              </>
            )}
          </span>
          <span className="flex items-center gap-2">
            <span className="font-mono">
              {progress.finished}/{progress.total} concluídos
            </span>
            <span className="text-slate-700">·</span>
            <span className="uppercase">{settings.format}</span>
          </span>
        </div>
      </div>
    );
  }

  if (lastRun) {
    const interrupted = lastRun.interrupted;
    const failed = lastRun.failed;
    const title = interrupted
      ? 'Lote interrompido'
      : failed > 0
        ? 'Lote finalizado com ocorrências'
        : 'Lote finalizado com sucesso';
    const subtitle = interrupted
      ? `${lastRun.success} capturadas · ${failed} falhas · ${formatClock(lastRun.durationMs)}`
      : `${lastRun.success} de ${lastRun.total} capturadas · ${formatClock(lastRun.durationMs)}`;
    const Icon = interrupted ? CircleSlash : failed > 0 ? AlertTriangle : CheckCircle2;
    const iconTone = interrupted
      ? 'border-amber-400/20 bg-amber-400/[0.07] text-amber-300'
      : failed > 0
        ? 'border-rose-400/20 bg-rose-400/[0.07] text-rose-300'
        : 'border-emerald-400/20 bg-emerald-400/[0.07] text-emerald-300';

    return (
      <div className="panel flex items-center gap-3 px-4 py-3.5">
        <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border', iconTone)}>
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[12.5px] font-semibold text-white">{title}</p>
          <p className="mt-0.5 truncate text-[11px] text-slate-500">{subtitle}</p>
        </div>
        <span
          className={cn(
            'chip',
            interrupted ? 'chip-amber' : failed > 0 ? 'chip-rose' : 'chip-emerald'
          )}
        >
          {interrupted
            ? 'Interrompido'
            : failed > 0
              ? `${failed} ${failed === 1 ? 'falha' : 'falhas'}`
              : `${validCount} prontas`}
        </span>
      </div>
    );
  }

  const ready = urlCount > 0;
  return (
    <div className="panel flex items-center gap-3 px-4 py-3.5">
      <span
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border',
          ready
            ? 'border-amber-400/20 bg-amber-400/[0.07] text-amber-300'
            : 'border-white/[0.08] bg-white/[0.03] text-slate-500'
        )}
      >
        <ScanLine className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[12.5px] font-semibold text-white">
          {ready ? 'Pronto para capturar' : 'Aguardando URLs'}
        </p>
        <p className="mt-0.5 truncate text-[11px] text-slate-500">
          {ready
            ? `${urlCount} ${urlCount === 1 ? 'link na fila' : 'links na fila'} · ${settings.fullPage ? 'full-page' : 'viewport'} · ${settings.width}×${settings.height}`
            : 'Cole os links na configuração para montar o lote.'}
        </p>
      </div>
      <span className="chip hidden sm:inline-flex">
        {ready ? 'Sequencial' : 'Ocioso'}
      </span>
    </div>
  );
}

/* -------------------------------- Empty state ------------------------------- */

function EmptyGallery({
  onTrySample,
  onShowShortcuts,
}: {
  onTrySample: () => void;
  onShowShortcuts: () => void;
}) {
  return (
    <div className="panel relative overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          backgroundImage:
            'radial-gradient(circle at 50% 0%, rgba(245,166,35,0.08), transparent 55%), linear-gradient(rgba(148,163,184,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.035) 1px, transparent 1px)',
          backgroundSize: 'auto, 40px 40px, 40px 40px',
          maskImage: 'radial-gradient(ellipse 70% 70% at 50% 30%, #000 20%, transparent 80%)',
          WebkitMaskImage:
            'radial-gradient(ellipse 70% 70% at 50% 30%, #000 20%, transparent 80%)',
        }}
      />
      <div className="relative flex flex-col items-center px-6 py-9 text-center">
        <div className="relative flex h-[72px] w-[72px] items-center justify-center">
          <span className="absolute inset-0 rotate-6 rounded-2xl border border-amber-400/15 bg-amber-400/[0.04]" />
          <span className="absolute inset-[7px] -rotate-3 rounded-2xl border border-white/[0.08] bg-white/[0.02]" />
          <span className="relative flex h-11 w-11 items-center justify-center rounded-xl border border-amber-400/30 bg-gradient-to-br from-amber-400/25 to-orange-500/[0.06] text-amber-300 shadow-[0_0_30px_-6px_rgba(245,166,35,0.55)]">
            <Images className="h-5 w-5" />
          </span>
        </div>

        <h3 className="mt-4 text-[15px] font-bold tracking-[-0.01em] text-white">
          Sua galeria começa aqui
        </h3>
        <p className="mt-1.5 max-w-sm text-[11.5px] leading-relaxed text-slate-500">
          Cole as URLs, ajuste o viewport e capture. As prévias aparecem aqui prontas
          para revisar, copiar e baixar em ZIP.
        </p>

        <div className="mt-5 grid w-full max-w-md grid-cols-3 gap-2">
          {[
            { number: '01', label: 'Cole as URLs' },
            { number: '02', label: 'Ajuste a captura' },
            { number: '03', label: 'Baixe em .zip' },
          ].map((step) => (
            <div
              key={step.number}
              className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-2.5 py-2 text-left"
            >
              <span className="font-mono text-[9.5px] font-semibold text-amber-400/80">
                {step.number}
              </span>
              <p className="mt-0.5 text-[10.5px] font-semibold leading-tight text-slate-300">
                {step.label}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={onTrySample}
            className="btn btn-secondary btn-sm"
          >
            <Play className="h-3.5 w-3.5 fill-current text-amber-400" />
            Capturar links de exemplo
          </button>
          <button
            type="button"
            onClick={onShowShortcuts}
            className="btn btn-ghost btn-sm text-slate-500"
          >
            <Keyboard className="h-3.5 w-3.5" />
            Atalhos
          </button>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-1.5">
          <span className="text-[9.5px] uppercase tracking-[0.14em] text-slate-600">
            Formatos
          </span>
          {['WebP', 'PDF', 'PNG', 'JPG'].map((format) => (
            <span
              key={format}
              className="rounded border border-white/[0.07] bg-white/[0.02] px-1.5 py-0.5 font-mono text-[9px] text-slate-500"
            >
              {format}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function EngineCapabilities() {
  const features = [
    {
      icon: MoveVertical,
      title: 'Auto-scroll progressivo',
      description: 'Ativa lazy loads e revela todas as seções antes do disparo.',
    },
    {
      icon: Sparkles,
      title: 'Texturas estabilizadas',
      description: 'Corrige parallax, grain e repetições em páginas longas.',
    },
    {
      icon: FileText,
      title: 'PDF vetorial contínuo',
      description: 'Documento de página única gerado direto do Chromium.',
    },
    {
      icon: Key,
      title: 'Auth, headers e cookies',
      description: 'Capture áreas logadas e ambientes de staging.',
    },
  ];

  return (
    <div className="mt-3 hidden sm:block">
      <div className="mb-2 flex items-center gap-2">
        <span className="text-[9.5px] font-semibold uppercase tracking-[0.16em] text-slate-600">
          Motor de captura
        </span>
        <span className="h-px flex-1 bg-white/[0.05]" />
        <span className="font-mono text-[9px] text-slate-700">4 recursos ativos</span>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {features.map((feature) => {
          const Icon = feature.icon;
          return (
            <div
              key={feature.title}
              className="flex items-start gap-2.5 rounded-xl border border-white/[0.055] bg-white/[0.015] px-3 py-2.5"
            >
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-amber-400/15 bg-amber-400/[0.06] text-amber-400/90">
                <Icon className="h-3 w-3" />
              </span>
              <div className="min-w-0">
                <p className="text-[10.5px] font-semibold text-slate-300">{feature.title}</p>
                <p className="mt-0.5 text-[9.5px] leading-snug text-slate-600">
                  {feature.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SkeletonGallery() {
  return (
    <div className="grid gap-3 xl:grid-cols-2" aria-hidden="true">
      {[0, 1].map((index) => (
        <div key={index} className="panel overflow-hidden">
          <div className="h-[148px] animate-pulse bg-white/[0.03]" />
          <div className="space-y-2 p-3.5">
            <div className="h-3 w-1/2 animate-pulse rounded bg-white/[0.05]" />
            <div className="h-2.5 w-2/3 animate-pulse rounded bg-white/[0.035]" />
            <div className="mt-3 h-7 animate-pulse rounded-lg bg-white/[0.03]" />
          </div>
        </div>
      ))}
    </div>
  );
}

/* --------------------------------- Cards ---------------------------------- */

function CaptureCard({
  item,
  onPreview,
  onDownload,
  onCopy,
  onRemove,
}: {
  item: CapturedItem;
  onPreview: (item: CapturedItem) => void;
  onDownload: (item: CapturedItem) => void;
  onCopy: (item: CapturedItem) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <article className="panel group overflow-hidden transition-[border-color,box-shadow] duration-200 hover:border-white/[0.16]">
      <div className="relative">
        <button
          type="button"
          onClick={() => onPreview(item)}
          aria-label={`Ampliar captura de ${hostOf(item.url)}`}
          className="relative block h-[148px] w-full overflow-hidden bg-[#060910] text-left"
        >
          <Thumbnail item={item} />
          <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#080c13] via-transparent to-transparent opacity-80" />
          <span className="absolute left-2.5 top-2.5">
            <FormatBadge format={item.format} />
          </span>
          <span className="absolute right-2.5 top-2.5 rounded-md border border-white/[0.08] bg-black/55 px-1.5 py-0.5 font-mono text-[9.5px] text-slate-300 backdrop-blur">
            {item.capturedAt}
          </span>
          <span className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-200 group-hover:opacity-100">
            <span className="flex items-center gap-1.5 rounded-lg border border-white/15 bg-black/60 px-2.5 py-1.5 text-[11px] font-semibold text-white shadow-lg backdrop-blur">
              <Maximize2 className="h-3.5 w-3.5 text-amber-400" />
              Ampliar
            </span>
          </span>
        </button>
      </div>

      <div className="p-3.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <a
              href={hrefOf(item.url)}
              target="_blank"
              rel="noreferrer"
              className="group/link flex items-center gap-1.5 text-[12.5px] font-bold text-slate-100 transition-colors hover:text-amber-300"
              title={item.url}
            >
              <span className="truncate">
                {hostOf(item.url)}
                <span className="text-slate-500">{pathOf(item.url)}</span>
              </span>
              <ExternalLink className="h-3 w-3 shrink-0 text-slate-600 transition-colors group-hover/link:text-amber-400" />
            </a>
            <p className="mt-0.5 truncate font-mono text-[9.5px] text-slate-600" title={item.url}>
              {item.url}
            </p>
          </div>
          <IconButton
            label={`Remover captura de ${hostOf(item.url)}`}
            onClick={() => onRemove(item.id)}
            className="-mr-1 -mt-1 h-6 w-6 shrink-0 text-slate-600 hover:text-rose-300"
          >
            <X className="h-3.5 w-3.5" />
          </IconButton>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[9.5px] text-slate-500">
          <span>
            {item.dimensions?.pageWidth} × {item.dimensions?.pageHeight}
          </span>
          <span className="text-slate-700">·</span>
          <span>{formatBytes(item.byteSize)}</span>
          <span className="text-slate-700">·</span>
          <span>{formatDuration(item.durationMs)}</span>
          {item.imgStats && item.imgStats.total > 0 && (
            <>
              <span className="text-slate-700">·</span>
              <span className="flex items-center gap-1 text-emerald-400/80">
                <Images className="h-2.5 w-2.5" />
                {item.imgStats.completed}/{item.imgStats.total}
              </span>
            </>
          )}
        </div>

        <div className="mt-2 flex items-center gap-1.5 overflow-hidden rounded-md border border-white/[0.05] bg-black/20 px-2 py-1">
          <FileCode className="h-3 w-3 shrink-0 text-slate-600" />
          <span className="truncate font-mono text-[9.5px] text-slate-400" title={item.fileName}>
            {item.fileName}
          </span>
        </div>

        <div className="mt-2.5 flex items-center gap-1.5 border-t border-white/[0.05] pt-2.5">
          <button
            type="button"
            onClick={() => onPreview(item)}
            className="btn btn-secondary btn-sm flex-1"
          >
            <Maximize2 className="h-3.5 w-3.5 text-slate-400" />
            Ver
          </button>
          {item.format !== 'pdf' && (
            <button
              type="button"
              onClick={() => onCopy(item)}
              className="btn btn-ghost btn-sm btn-icon text-slate-500 hover:text-slate-200"
              title="Copiar imagem"
              aria-label="Copiar imagem para a área de transferência"
            >
              <Copy className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={() => onDownload(item)}
            className="btn btn-secondary btn-sm flex-1 border-amber-400/20 text-amber-200 hover:border-amber-400/40"
          >
            <Download className="h-3.5 w-3.5" />
            Baixar
          </button>
        </div>
      </div>
    </article>
  );
}

function ErrorCard({
  item,
  isRunning,
  onRetry,
  onRemove,
}: {
  item: CapturedItem;
  isRunning: boolean;
  onRetry: (item: CapturedItem) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <article className="panel border-rose-500/20 bg-rose-500/[0.025] p-3.5">
      <div className="flex items-start gap-2.5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-rose-400/20 bg-rose-400/[0.08] text-rose-300">
          <AlertTriangle className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <a
              href={hrefOf(item.url)}
              target="_blank"
              rel="noreferrer"
              className="min-w-0 flex-1 truncate text-[12px] font-semibold text-slate-100 transition-colors hover:text-amber-300"
              title={item.url}
            >
              {hostOf(item.url)}
              <span className="text-slate-500">{pathOf(item.url)}</span>
            </a>
            <span className="shrink-0 font-mono text-[9.5px] text-slate-600">
              {item.capturedAt}
            </span>
          </div>
          <p className="mt-1 break-words font-mono text-[10px] leading-relaxed text-rose-300/80">
            {item.error || 'A página retornou 0 bytes por limites de renderização.'}
          </p>
          <div className="mt-2 flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onRetry(item)}
              disabled={isRunning}
              className="btn btn-secondary btn-sm"
            >
              <RefreshCw className="h-3 w-3 text-amber-400" />
              Tentar novamente
            </button>
            <button
              type="button"
              onClick={() => onRemove(item.id)}
              className="btn btn-ghost btn-sm text-slate-500 hover:text-rose-300"
            >
              <Trash2 className="h-3 w-3" />
              Remover
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

function Thumbnail({ item }: { item: CapturedItem }) {
  const [failed, setFailed] = useState(false);
  const source = item.previewDataUrl || item.dataUrl;

  if (!source || failed) {
    return (
      <span className="flex h-full w-full flex-col items-center justify-center gap-2 bg-[#070b12] text-slate-600">
        <Images className="h-5 w-5" />
        <span className="text-[10px]">Prévia indisponível</span>
      </span>
    );
  }

  return (
    <img
      src={source}
      alt=""
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      className="h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-[1.025]"
    />
  );
}

function FormatBadge({ format }: { format: OutputFormat }) {
  const styles: Record<OutputFormat, string> = {
    webp: 'border-amber-400/30 bg-amber-950/70 text-amber-300',
    pdf: 'border-rose-400/30 bg-rose-950/70 text-rose-300',
    png: 'border-emerald-400/30 bg-emerald-950/70 text-emerald-300',
    jpg: 'border-slate-400/25 bg-slate-950/70 text-slate-300',
  };
  return (
    <span
      className={cn(
        'rounded border px-1.5 py-0.5 font-mono text-[9px] font-bold tracking-wide backdrop-blur',
        styles[format]
      )}
    >
      {format.toUpperCase()}
    </span>
  );
}
