import { useState } from 'react';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  CircleSlash,
  Clock,
  Copy,
  Download,
  ExternalLink,
  FileArchive,
  FileCode,
  Grid2X2,
  Grid3X3,
  Images,
  Keyboard,
  Layers,
  Maximize2,
  PanelRightClose,
  PanelRightOpen,
  Pencil,
  Plus,
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
  isCaptured,
  isFailed,
  isPending,
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
export type GalleryDensity = 'comfortable' | 'compact';

interface ResultsPanelProps {
  items: CapturedItem[];
  isRunning: boolean;
  progress: RunProgress;
  elapsedMs: number;
  lastRun: LastRun | null;
  settings: CaptureSettings;
  urlCount: number;
  filter: GalleryFilter;
  selectedId: string | null;
  onFilterChange: (filter: GalleryFilter) => void;
  onSelect: (item: CapturedItem) => void;
  onPreview: (item: CapturedItem) => void;
  onDownload: (item: CapturedItem) => void;
  onCopy: (item: CapturedItem) => void;
  onRemove: (id: string) => void;
  onRetry: (item: CapturedItem) => void;
  onZip: () => void;
  onZipCancel: () => void;
  onClear: () => void;
  onAddExamples: () => void;
  onRename: (item: CapturedItem) => void;
  onDevReport: (item: CapturedItem) => void;
  hasDevReport: (item: CapturedItem) => boolean;
  onShowShortcuts: () => void;
  showInspectorToggle: boolean;
  isInspectorOpen: boolean;
  onToggleInspector: () => void;
  zipState: {
    active: boolean;
    total: number;
    loadedBytes: number;
    totalBytes: number;
    percent: number;
  };
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
  selectedId,
  onFilterChange,
  onSelect,
  onPreview,
  onDownload,
  onCopy,
  onRemove,
  onRetry,
  onZip,
  onZipCancel,
  onClear,
  onAddExamples,
  onRename,
  onDevReport,
  hasDevReport,
  onShowShortcuts,
  showInspectorToggle,
  isInspectorOpen,
  onToggleInspector,
  zipState,
}: ResultsPanelProps) {
  const [density, setDensity] = useState<GalleryDensity>('comfortable');

  const validItems = items.filter(isCaptured);
  const failedItems = items.filter(isFailed);
  const pendingItems = items.filter(isPending);
  const totalBytes = validItems.reduce((sum, item) => sum + (item.byteSize || 0), 0);
  const visibleItems =
    filter === 'error' ? failedItems : filter === 'success' ? validItems : items;
  const showFilter = failedItems.length > 0 && validItems.length > 0;

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#070a11]">
      <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {isRunning
          ? `Capturando ${Math.min(progress.finished + 1, progress.total)} de ${progress.total} links.`
          : lastRun
            ? lastRun.interrupted
              ? 'Captura interrompida.'
              : `Lote finalizado com ${lastRun.success} de ${lastRun.total} capturas.`
            : 'Aguardando capturas.'}
      </p>

      {/* Canvas toolbar */}
      <header className="flex h-[54px] shrink-0 items-center gap-2 border-b border-white/[0.06] bg-[#080b12]/90 px-3 backdrop-blur lg:gap-3 lg:px-4">
        <div className="flex min-w-0 items-center gap-2">
          <span className="hidden h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.03] text-slate-400 sm:flex">
            <Layers className="h-3.5 w-3.5" />
          </span>
          <h2 className="shrink-0 text-[14.5px] font-bold tracking-[-0.01em] text-white">
            Galeria
          </h2>
          <span className="chip">
            {validItems.length} {validItems.length === 1 ? 'captura' : 'capturas'}
          </span>
          {pendingItems.length > 0 && (
            <span className="chip chip-blue">
              {pendingItems.length} na fila
            </span>
          )}
          {validItems.length > 0 && (
            <span className="hidden items-center gap-1.5 font-mono text-[11.5px] text-slate-400 xl:flex">
              <span className="h-3 w-px bg-white/10" />
              {formatBytes(totalBytes)}
            </span>
          )}
          {failedItems.length > 0 && (
            <span className="chip chip-rose hidden sm:inline-flex">
              {failedItems.length} {failedItems.length === 1 ? 'falha' : 'falhas'}
            </span>
          )}
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-1.5">
          {showInspectorToggle && (
            <button
              type="button"
              onClick={onToggleInspector}
              aria-label={isInspectorOpen ? 'Fechar inspetor' : 'Abrir inspetor'}
              aria-controls="inspector-panel"
              aria-expanded={isInspectorOpen}
              title={isInspectorOpen ? 'Fechar inspetor' : 'Abrir inspetor'}
              className={cn(
                'btn btn-ghost btn-sm h-8 gap-1.5 px-2 xl:hidden',
                isInspectorOpen ? 'text-amber-300' : 'text-slate-400 hover:text-white'
              )}
            >
              {isInspectorOpen ? (
                <PanelRightClose className="h-[18px] w-[18px]" />
              ) : (
                <PanelRightOpen className="h-[18px] w-[18px]" />
              )}
              <span className="hidden md:inline">Detalhes</span>
            </button>
          )}

          {showFilter && (
            <div className="mr-0.5 hidden rounded-lg border border-white/[0.07] bg-black/30 p-0.5 md:flex">
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
                    'rounded-md px-2 py-1 text-[12px] font-semibold transition-colors',
                    filter === option.id
                      ? 'bg-white/[0.08] text-white'
                      : 'text-slate-400 hover:text-slate-300'
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}

          {items.length > 0 && (
            <div className="hidden rounded-lg border border-white/[0.07] bg-black/30 p-0.5 lg:flex">
              <IconButton
                label="Grade ampla"
                onClick={() => setDensity('comfortable')}
                className={cn(
                  'h-7 w-7 rounded-md',
                  density === 'comfortable'
                    ? 'bg-white/[0.09] text-amber-300'
                    : 'text-slate-400 hover:text-slate-300'
                )}
              >
                <Grid2X2 className="h-4 w-4" />
              </IconButton>
              <IconButton
                label="Grade compacta"
                onClick={() => setDensity('compact')}
                className={cn(
                  'h-7 w-7 rounded-md',
                  density === 'compact'
                    ? 'bg-white/[0.09] text-amber-300'
                    : 'text-slate-400 hover:text-slate-300'
                )}
              >
                <Grid3X3 className="h-4 w-4" />
              </IconButton>
            </div>
          )}

          {zipState.active ? (
            <div
              className="flex items-center gap-1.5 rounded-lg border border-amber-400/25 bg-amber-400/[0.08] px-2 py-1.5"
              title={
                zipState.totalBytes > 0
                  ? `Gerando ZIP: ${zipState.percent}%`
                  : 'Gerando ZIP'
              }
            >
              <Spinner className="h-3.5 w-3.5 text-amber-400" />
              <span className="font-mono text-[11.5px] font-bold text-amber-200">
                {zipState.totalBytes > 0 ? `${zipState.percent}%` : 'ZIP'}
              </span>
              <span className="hidden text-[11.5px] text-slate-300 sm:inline">
                gerando
              </span>
              <button
                type="button"
                onClick={onZipCancel}
                aria-label="Cancelar geração do ZIP"
                title="Cancelar geração do ZIP"
                className="flex h-6 w-6 items-center justify-center rounded text-slate-400 transition-colors hover:bg-rose-400/10 hover:text-rose-300"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : validItems.length > 0 ? (
            <button
              type="button"
              onClick={onZip}
              disabled={isRunning}
              className="btn btn-primary btn-sm"
              title="Baixar todas as capturas em um arquivo ZIP"
              aria-label={`Baixar ZIP com ${validItems.length} ${
                validItems.length === 1 ? 'arquivo' : 'arquivos'
              }`}
            >
              <FileArchive className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Baixar ZIP</span>
              <span aria-hidden="true" className="font-mono text-[11.5px] font-bold opacity-70">
                {validItems.length}
              </span>
            </button>
          ) : null}

          {items.length > 0 && (
            <button
              type="button"
              onClick={onClear}
              disabled={isRunning}
              aria-label="Limpar galeria"
              className="btn btn-ghost btn-sm text-slate-400 hover:text-rose-300"
              title="Limpar galeria"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span className="hidden xl:inline">Limpar</span>
            </button>
          )}
        </div>
      </header>

      {/* Canvas */}
      <div className="canvas-board scroll-area relative min-h-0 flex-1 overflow-y-auto">
        <div className="relative z-10 mx-auto flex min-h-full w-full max-w-[1680px] flex-col gap-3.5 px-3 py-3.5 lg:px-4">
          {(isRunning || lastRun) && (
            <RunStatusBar
              isRunning={isRunning}
              progress={progress}
              elapsedMs={elapsedMs}
              lastRun={lastRun}
              settings={settings}
              validCount={validItems.length}
            />
          )}

          {items.length === 0 && !isRunning && (
            <EmptyCanvas
              urlCount={urlCount}
              onAddExamples={onAddExamples}
              onShowShortcuts={onShowShortcuts}
            />
          )}

          {items.length === 0 && isRunning && <SkeletonCanvas />}

          {items.length > 0 && visibleItems.length === 0 && (
            <div className="panel mx-auto flex max-w-md flex-col items-center px-6 py-10 text-center">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03] text-slate-400">
                <Images className="h-4 w-4" />
              </span>
              <p className="mt-3 text-[14.5px] font-semibold text-slate-200">
                Nada neste filtro
              </p>
              <p className="mt-1 text-[12.5px] text-slate-400">
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
            <div
              className={cn(
                'grid gap-3.5',
                density === 'compact'
                  ? 'grid-cols-[repeat(auto-fill,minmax(250px,1fr))]'
                  : 'grid-cols-[repeat(auto-fill,minmax(310px,1fr))]'
              )}
            >
              {visibleItems.map((item) => {
                if (isPending(item)) {
                  return <QueueCard key={item.id} item={item} />;
                }
                if (isFailed(item)) {
                  return (
                    <ErrorCard
                      key={item.id}
                      item={item}
                      isRunning={isRunning}
                      isSelected={selectedId === item.id}
                      onSelect={onSelect}
                      onRetry={onRetry}
                      onRemove={onRemove}
                    />
                  );
                }
                return (
                  <CaptureCard
                    key={item.id}
                    item={item}
                    isSelected={selectedId === item.id}
                    onSelect={onSelect}
                    onPreview={onPreview}
                    onDownload={onDownload}
                    onCopy={onCopy}
                    onRemove={onRemove}
                    onRename={onRename}
                    onDevReport={onDevReport}
                    hasDevReport={hasDevReport(item)}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Canvas status bar */}
      <footer className="flex h-8 shrink-0 items-center justify-between gap-3 border-t border-white/[0.06] bg-[#070a11] px-3 text-[11.5px] text-slate-400 lg:px-4">
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400/80" />
          <span className="truncate">Capturas locais — relatórios Dev usam a API DeepSeek sob demanda.</span>
        </span>
        <span className="flex shrink-0 items-center gap-2.5 font-mono">
          <span className="hidden sm:inline">
            {validItems.length} {validItems.length === 1 ? 'captura' : 'capturas'}
            {pendingItems.length > 0 ? ` · ${pendingItems.length} na fila` : ''}
          </span>
          {validItems.length > 0 && (
            <>
              <span className="hidden text-slate-700 sm:inline">·</span>
              <span>{formatBytes(totalBytes)}</span>
            </>
          )}
          <span className="hidden text-slate-700 md:inline">·</span>
          <span className="hidden md:inline">Chromium Snapper v1.2</span>
        </span>
      </footer>
    </div>
  );
}

/* ------------------------------- Status bar ------------------------------- */

function RunStatusBar({
  isRunning,
  progress,
  elapsedMs,
  lastRun,
  settings,
  validCount,
}: {
  isRunning: boolean;
  progress: RunProgress;
  elapsedMs: number;
  lastRun: LastRun | null;
  settings: CaptureSettings;
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
      <div className="anim-in relative overflow-hidden rounded-xl border border-amber-400/20 bg-[#0b0f18]/90">
        <div className="flex items-center gap-3 px-3.5 py-2.5">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-amber-400/25 bg-amber-400/10">
            <Spinner className="h-3.5 w-3.5 text-amber-400" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate text-[13px] font-semibold text-white">
                Capturando {current} de {progress.total}
              </p>
              <span className="chip chip-amber hidden shrink-0 sm:inline-flex">
                {stepLabel(progress.step)}
              </span>
            </div>
            <p className="mt-0.5 truncate text-[12px] text-slate-400">
              {progress.statusText || 'Preparando o ambiente de captura...'}
            </p>
          </div>
          <div className="hidden shrink-0 items-center gap-3 font-mono text-[11.5px] text-slate-400 sm:flex">
            <span>{formatClock(elapsedMs)}</span>
            {etaMs !== null && <span>~{formatClock(etaMs)} restantes</span>}
            <span className="text-[15px] font-semibold tabular-nums text-white">{percent}%</span>
          </div>
          <span className="shrink-0 font-mono text-[14px] font-semibold tabular-nums text-white sm:hidden">
            {percent}%
          </span>
        </div>
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
          aria-label="Progresso do lote"
          className="h-[3px] w-full bg-white/[0.06]"
        >
          <div
            className="shimmer h-full bg-gradient-to-r from-amber-500 to-orange-400 transition-[width] duration-500"
            style={{ width: `${Math.max(percent, 2)}%` }}
          />
        </div>
      </div>
    );
  }

  if (!lastRun) return null;

  const interrupted = lastRun.interrupted;
  const failed = lastRun.failed;
  const title = interrupted
    ? 'Lote interrompido'
    : failed > 0
      ? 'Lote finalizado com ocorrências'
      : 'Lote finalizado com sucesso';
  const subtitle = interrupted
    ? `${lastRun.success} capturadas · ${failed} falhas · ${formatClock(lastRun.durationMs)}`
    : `${lastRun.success} de ${lastRun.total} capturadas · ${formatClock(lastRun.durationMs)} · ${settings.format.toUpperCase()}`;
  const Icon = interrupted ? CircleSlash : failed > 0 ? AlertTriangle : CheckCircle2;
  const tone = interrupted
    ? 'border-amber-400/20 bg-amber-400/[0.06] text-amber-300'
    : failed > 0
      ? 'border-rose-400/20 bg-rose-400/[0.06] text-rose-300'
      : 'border-emerald-400/20 bg-emerald-400/[0.06] text-emerald-300';

  return (
    <div className="anim-in flex items-center gap-3 rounded-xl border border-white/[0.07] bg-[#0b0f18]/90 px-3.5 py-2.5">
      <span className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border', tone)}>
        <Icon className="h-3.5 w-3.5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-semibold text-white">{title}</p>
        <p className="mt-0.5 truncate text-[12px] text-slate-400">{subtitle}</p>
      </div>
      <span
        className={cn(
          'chip shrink-0',
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

/* -------------------------------- Empty state ------------------------------- */

function EmptyCanvas({
  urlCount,
  onAddExamples,
  onShowShortcuts,
}: {
  urlCount: number;
  onAddExamples: () => void;
  onShowShortcuts: () => void;
}) {
  return (
    <div className="flex flex-1 items-center justify-center py-4 sm:py-8">
      <div className="relative w-full max-w-[780px] rounded-2xl border border-dashed border-white/[0.14] bg-[#080b12]/55 px-6 py-9 text-center backdrop-blur-[2px] sm:px-10 sm:py-12">
        {/* Corner marks */}
        {[
          'left-3 top-3 border-l border-t',
          'right-3 top-3 border-r border-t',
          'left-3 bottom-3 border-b border-l',
          'right-3 bottom-3 border-b border-r',
        ].map((position) => (
          <span
            key={position}
            aria-hidden="true"
            className={cn('absolute h-3 w-3 border-white/15', position)}
          />
        ))}

        <div className="relative mx-auto flex h-[68px] w-[68px] items-center justify-center">
          <span className="absolute inset-0 rotate-6 rounded-2xl border border-amber-400/15 bg-amber-400/[0.04]" />
          <span className="absolute inset-[7px] -rotate-3 rounded-2xl border border-white/[0.08] bg-white/[0.02]" />
          <span className="relative flex h-11 w-11 items-center justify-center rounded-xl border border-amber-400/30 bg-gradient-to-br from-amber-400/25 to-orange-500/[0.06] text-amber-300 shadow-[0_0_36px_-8px_rgba(245,166,35,0.6)]">
            <ScanLine className="h-5 w-5" />
          </span>
        </div>

        <h3 className="mt-5 text-[19.5px] font-bold tracking-[-0.02em] text-white">
          Seu canvas está vazio
        </h3>
        <p className="mx-auto mt-2 max-w-md text-[14.5px] leading-relaxed text-slate-400">
          {urlCount > 0
            ? `Há ${urlCount} ${urlCount === 1 ? 'link pronto' : 'links prontos'} na fila. Inicie a captura para transformar cada página em um artboard aqui.`
            : 'Cole as URLs no painel de configuração e inicie o lote. Cada página capturada vira um artboard navegável neste canvas.'}
        </p>

        <div className="mx-auto mt-6 grid max-w-md grid-cols-3 gap-2">
          {[
            { number: '01', label: 'Cole as URLs', hint: 'até 50 por lote' },
            { number: '02', label: 'Ajuste a captura', hint: 'viewport e saída' },
            { number: '03', label: 'Revise no canvas', hint: 'ZIP ou Relatório Dev' },
          ].map((step) => (
            <div
              key={step.number}
              className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-2.5 py-2 text-left"
            >
              <span className="font-mono text-[10.5px] font-semibold text-amber-400/80">
                {step.number}
              </span>
              <p className="mt-0.5 text-[12px] font-semibold leading-tight text-slate-300">
                {step.label}
              </p>
              <p className="mt-0.5 text-[10.5px] leading-tight text-slate-400">{step.hint}</p>
            </div>
          ))}
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          <button type="button" onClick={onAddExamples} className="btn btn-primary btn-sm">
            <Plus className="h-3.5 w-3.5" />
            Adicionar links de exemplo
          </button>
          <button
            type="button"
            onClick={onShowShortcuts}
            className="btn btn-secondary btn-sm"
          >
            <Keyboard className="h-3.5 w-3.5 text-slate-400" />
            Atalhos
          </button>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-1.5">
          <span className="text-[10.5px] uppercase tracking-[0.14em] text-slate-400">
            Formatos
          </span>
          {['WebP', 'PDF', 'PNG', 'JPG'].map((format) => (
            <span
              key={format}
              className="rounded border border-white/[0.07] bg-white/[0.02] px-1.5 py-0.5 font-mono text-[10.5px] text-slate-400"
            >
              {format}
            </span>
          ))}
          <span className="mx-1 hidden h-3 w-px bg-white/10 sm:block" />
          <span className="flex items-center gap-1 font-mono text-[10.5px] text-slate-400">
            <Keyboard className="h-2.5 w-2.5" /> Ctrl + Enter
          </span>
        </div>
      </div>
    </div>
  );
}

function SkeletonCanvas() {
  return (
    <div className="grid gap-3.5 grid-cols-[repeat(auto-fill,minmax(310px,1fr))]" aria-hidden="true">
      {[0, 1, 2].map((index) => (
        <div
          key={index}
          className="overflow-hidden rounded-xl border border-white/[0.07] bg-[#0a0e16]"
        >
          <div className="flex h-7 items-center gap-1.5 border-b border-white/[0.05] bg-[#0c1119] px-2.5">
            {[0, 1, 2].map((dot) => (
              <span key={dot} className="h-1.5 w-1.5 rounded-full bg-white/[0.08]" />
            ))}
            <span className="ml-1 h-2 w-1/3 animate-pulse rounded bg-white/[0.05]" />
          </div>
          <div className="aspect-[16/10] animate-pulse bg-white/[0.03]" />
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
  isSelected,
  onSelect,
  onPreview,
  onDownload,
  onCopy,
  onRemove,
  onRename,
  onDevReport,
  hasDevReport,
}: {
  item: CapturedItem;
  isSelected: boolean;
  onSelect: (item: CapturedItem) => void;
  onPreview: (item: CapturedItem) => void;
  onDownload: (item: CapturedItem) => void;
  onCopy: (item: CapturedItem) => void;
  onRemove: (id: string) => void;
  onRename: (item: CapturedItem) => void;
  onDevReport: (item: CapturedItem) => void;
  hasDevReport: boolean;
}) {
  return (
    <article
      className={cn(
        'artboard group flex flex-col overflow-hidden rounded-xl border bg-[#0a0e16] transition-[border-color,box-shadow,transform] duration-200',
        isSelected
          ? 'border-amber-400/55 shadow-[0_0_0_1px_rgba(245,166,35,0.25),0_22px_48px_-28px_rgba(0,0,0,0.95)]'
          : 'border-white/[0.08] hover:-translate-y-0.5 hover:border-white/[0.16]'
      )}
    >
      {/* Browser chrome */}
      <div className="flex h-7 shrink-0 items-center gap-1.5 border-b border-white/[0.05] bg-[#0c1119] px-2.5">
        <span className="h-1.5 w-1.5 rounded-full bg-rose-400/45" />
        <span className="h-1.5 w-1.5 rounded-full bg-amber-400/45" />
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400/40" />
        <button
          type="button"
          onClick={() => onRename(item)}
          title="Renomear arquivo antes de baixar"
          aria-label={`Renomear arquivo ${item.fileName}`}
          className="ml-1.5 flex min-w-0 flex-1 items-center gap-1 overflow-hidden rounded px-0.5 text-left font-mono text-[11px] text-slate-400 transition-colors hover:text-amber-300 focus-visible:text-amber-300"
        >
          <span className="truncate">{item.fileName}</span>
          <Pencil className="h-2.5 w-2.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100" />
        </button>
        <span className="hidden shrink-0 font-mono text-[11px] text-slate-400 group-hover:hidden sm:inline">
          {item.capturedAt}
        </span>
        <button
          type="button"
          onClick={() => onRemove(item.id)}
          aria-label={`Remover captura de ${hostOf(item.url)}`}
          title="Remover captura"
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-slate-400 opacity-100 transition-colors hover:bg-rose-400/10 hover:text-rose-300 focus-visible:bg-rose-400/10 focus-visible:text-rose-200 focus-visible:opacity-100 group-focus-within:opacity-100 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100"
        >
          <X className="h-3 w-3" />
        </button>
      </div>

      {/* Artboard preview */}
      <button
        type="button"
        onClick={() => onSelect(item)}
        onDoubleClick={() => onPreview(item)}
        aria-label={`Selecionar captura de ${hostOf(item.url)}. Duplo clique para ampliar.`}
        aria-pressed={isSelected}
        className="relative block aspect-[16/10] w-full shrink-0 overflow-hidden bg-[#060910] text-left"
      >
        <Thumbnail item={item} />
        <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#080c13]/85 via-transparent to-transparent opacity-80" />
        <span className="absolute left-2 top-2">
          <FormatBadge format={item.format} />
        </span>
        {isSelected && (
          <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-amber-400 text-[#1b1305] shadow-sm">
            <Check className="h-3 w-3" strokeWidth={3} />
          </span>
        )}
        <span className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          <span className="flex items-center gap-1.5 rounded-lg border border-white/15 bg-black/65 px-2.5 py-1.5 text-[12px] font-semibold text-white shadow-lg backdrop-blur">
            <Maximize2 className="h-3 w-3 text-amber-400" />
            Duplo clique para ampliar
          </span>
        </span>
      </button>

      <div className="flex flex-1 flex-col p-3">
        <div className="flex min-w-0 items-center gap-1.5">
          <a
            href={hrefOf(item.url)}
            target="_blank"
            rel="noreferrer"
            onClick={(event) => event.stopPropagation()}
            className="group/link flex min-w-0 items-center gap-1.5 text-[14.5px] font-bold text-slate-100 transition-colors hover:text-amber-300"
            title={item.url}
          >
            <span className="truncate">
              {hostOf(item.url)}
              <span className="font-medium text-slate-400">{pathOf(item.url)}</span>
            </span>
            <ExternalLink className="h-3 w-3 shrink-0 text-slate-400 transition-colors group-hover/link:text-amber-400" />
          </a>
        </div>

        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[11px] text-slate-400">
          <span>
            {item.dimensions?.pageWidth ?? '—'} × {item.dimensions?.pageHeight ?? '—'}
          </span>
          <span className="text-slate-700">·</span>
          <span>{formatBytes(item.byteSize)}</span>
          <span className="text-slate-700">·</span>
          <span>{formatDuration(item.durationMs)}</span>
          {item.imgStats && item.imgStats.total > 0 && (
            <>
              <span className="text-slate-700">·</span>
              <span className="flex items-center gap-1 text-emerald-400/75">
                <Images className="h-2.5 w-2.5" />
                {item.imgStats.completed}/{item.imgStats.total}
              </span>
            </>
          )}
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
              className="btn btn-ghost btn-sm btn-icon text-slate-400 hover:text-slate-200"
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

        <button
          type="button"
          onClick={() => onDevReport(item)}
          className={cn(
            'btn btn-sm mt-1.5 w-full border',
            hasDevReport
              ? 'border-emerald-400/25 bg-emerald-400/[0.07] text-emerald-200 hover:border-emerald-400/45'
              : 'border-indigo-400/25 bg-indigo-400/[0.06] text-indigo-200 hover:border-indigo-400/45 hover:bg-indigo-400/[0.1]'
          )}
          title={
            hasDevReport
              ? 'Abrir o relatório Dev gerado para esta página'
              : 'Gerar relatório de engenharia reversa com a IA'
          }
        >
          {hasDevReport ? (
            <Check className="h-3.5 w-3.5" />
          ) : (
            <Sparkles className="h-3.5 w-3.5" />
          )}
          {hasDevReport ? 'Abrir relatório Dev' : 'Obter relatório Dev'}
          {hasDevReport && (
            <span className="rounded border border-emerald-400/25 bg-emerald-400/10 px-1 py-0.5 font-mono text-[9.5px] font-bold uppercase tracking-wide">
              IA
            </span>
          )}
        </button>
      </div>
    </article>
  );
}

function QueueCard({ item }: { item: CapturedItem }) {
  const isCurrent = item.status === 'processing';

  return (
    <article
      aria-label={`${isCurrent ? 'Capturando' : 'Na fila'}: ${hostOf(item.url)}`}
      className={cn(
        'artboard flex flex-col overflow-hidden rounded-xl border bg-[#0a0e16]',
        isCurrent
          ? 'border-amber-400/30 shadow-[0_0_0_1px_rgba(245,166,35,0.12)]'
          : 'border-white/[0.08]'
      )}
    >
      <div className="flex h-7 shrink-0 items-center gap-1.5 border-b border-white/[0.05] bg-[#0c1119] px-2.5">
        <span className="h-1.5 w-1.5 rounded-full bg-white/[0.14]" />
        <span className="h-1.5 w-1.5 rounded-full bg-white/[0.1]" />
        <span className="h-1.5 w-1.5 rounded-full bg-white/[0.08]" />
        <span className="ml-1.5 min-w-0 flex-1 truncate font-mono text-[11px] text-slate-400">
          {item.fileName || hostOf(item.url)}
        </span>
        <span
          className={cn(
            'rounded border px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wide',
            isCurrent
              ? 'border-amber-400/30 bg-amber-400/10 text-amber-300'
              : 'border-sky-400/25 bg-sky-400/10 text-sky-300'
          )}
        >
          {isCurrent ? 'capturando' : 'na fila'}
        </span>
      </div>

      <div className="relative aspect-[16/10] w-full shrink-0 overflow-hidden bg-[#060910]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(245,166,35,0.06),transparent_60%)]" />
        <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-white/[0.035] via-transparent to-transparent" />
        <div className="relative flex h-full flex-col items-center justify-center gap-2.5 px-6 text-center">
          <span
            className={cn(
              'flex h-9 w-9 items-center justify-center rounded-xl border',
              isCurrent
                ? 'border-amber-400/25 bg-amber-400/[0.08] text-amber-300'
                : 'border-white/[0.08] bg-white/[0.03] text-slate-400'
            )}
          >
            {isCurrent ? (
              <Spinner className="h-4 w-4" />
            ) : (
              <Clock className="h-4 w-4" />
            )}
          </span>
          <span className="text-[12.5px] font-semibold text-slate-300">
            {isCurrent ? stepLabel(item.step || 'running') : 'Aguardando na fila'}
          </span>
          <span className="max-w-full truncate font-mono text-[10.5px] text-slate-400">
            {hostOf(item.url)}
            {pathOf(item.url)}
          </span>
          <span className="flex items-center gap-1" aria-hidden="true">
            <span className={cn('h-1 w-6 rounded-full', isCurrent ? 'bg-amber-400/70' : 'bg-white/[0.12]')} />
            <span className={cn('h-1 w-6 rounded-full', isCurrent ? 'bg-amber-400/40' : 'bg-white/[0.08]')} />
            <span className={cn('h-1 w-6 rounded-full', isCurrent ? 'bg-amber-400/20' : 'bg-white/[0.05]')} />
          </span>
        </div>
        <span className="absolute left-2 top-2">
          <FormatBadge format={item.format} />
        </span>
      </div>

      <div className="flex flex-1 flex-col p-3">
        <p className="min-w-0 truncate text-[14.5px] font-bold text-slate-100">
          {hostOf(item.url)}
          <span className="font-medium text-slate-400">{pathOf(item.url)}</span>
        </p>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[11px] text-slate-400">
          <span>#{item.index + 1}</span>
          <span className="text-slate-700">·</span>
          <span>
            {item.dimensions?.pageWidth ?? '—'} × {item.dimensions?.pageHeight || '—'}
          </span>
          <span className="text-slate-700">·</span>
          <span>{isCurrent ? stepLabel(item.step || 'running') : 'aguardando'}</span>
        </div>
        <div className="mt-2.5 flex h-[34px] items-center justify-center gap-1.5 border-t border-white/[0.05] pt-2.5 text-[11.5px] text-slate-400">
          {isCurrent ? (
            <>
              <Spinner className="h-3 w-3 text-amber-400" />
              Processando...
            </>
          ) : (
            <>
              <Clock className="h-3 w-3" />
              Aguardando na fila
            </>
          )}
        </div>
      </div>
    </article>
  );
}

function ErrorCard({
  item,
  isRunning,
  isSelected,
  onSelect,
  onRetry,
  onRemove,
}: {
  item: CapturedItem;
  isRunning: boolean;
  isSelected: boolean;
  onSelect: (item: CapturedItem) => void;
  onRetry: (item: CapturedItem) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <article
      className={cn(
        'flex flex-col overflow-hidden rounded-xl border bg-[#0d0b12] transition-colors',
        isSelected
          ? 'border-rose-400/45 shadow-[0_0_0_1px_rgba(251,113,133,0.2)]'
          : 'border-rose-500/20 hover:border-rose-400/35'
      )}
    >
      <div className="flex h-7 items-center gap-1.5 border-b border-rose-400/10 bg-rose-950/20 px-2.5">
        <span className="h-1.5 w-1.5 rounded-full bg-rose-400/70" />
        <span className="ml-1 truncate font-mono text-[10.5px] text-rose-200/70">
          erro de captura
        </span>
        <span className="ml-auto font-mono text-[10.5px] text-slate-400">{item.capturedAt}</span>
      </div>

      <div className="flex flex-1 flex-col p-3.5">
        <div className="flex items-start gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-rose-400/20 bg-rose-400/[0.08] text-rose-300">
            <AlertTriangle className="h-4 w-4" />
          </span>
          <button
            type="button"
            onClick={() => onSelect(item)}
            aria-pressed={isSelected}
            className="min-w-0 flex-1 text-left"
          >
            <span className="block truncate text-[14px] font-semibold text-slate-100">
              {hostOf(item.url)}
              <span className="font-normal text-slate-400">{pathOf(item.url)}</span>
            </span>
            <span className="mt-0.5 block truncate font-mono text-[11px] text-slate-400">
              {item.url}
            </span>
          </button>
        </div>

        <p className="mt-2.5 line-clamp-3 break-words rounded-lg border border-rose-400/10 bg-rose-400/[0.04] px-2.5 py-2 font-mono text-[11.5px] leading-relaxed text-rose-300/80">
          {item.error || 'A página retornou 0 bytes por limites de renderização.'}
        </p>

        <div className="mt-auto flex items-center gap-1.5 pt-3">
          <button
            type="button"
            onClick={() => onRetry(item)}
            disabled={isRunning}
            className="btn btn-secondary btn-sm flex-1"
          >
            <RefreshCw className="h-3 w-3 text-amber-400" />
            Tentar novamente
          </button>
          <button
            type="button"
            onClick={() => onRemove(item.id)}
            className="btn btn-ghost btn-sm text-slate-400 hover:text-rose-300"
          >
            <Trash2 className="h-3 w-3" />
            Remover
          </button>
        </div>
      </div>
    </article>
  );
}

function Thumbnail({ item }: { item: CapturedItem }) {
  const [failed, setFailed] = useState(false);
  const source = item.previewDataUrl;

  if (!source || failed) {
    return (
      <span className="flex h-full w-full flex-col items-center justify-center gap-2 bg-[#070b12] text-slate-400">
        <Images className="h-5 w-5" />
        <span className="text-[11.5px]">Prévia indisponível</span>
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
      className="h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-[1.02]"
    />
  );
}

function FormatBadge({ format }: { format: OutputFormat }) {
  const styles: Record<OutputFormat, string> = {
    webp: 'border-amber-400/30 bg-amber-950/75 text-amber-300',
    pdf: 'border-rose-400/30 bg-rose-950/75 text-rose-300',
    png: 'border-emerald-400/30 bg-emerald-950/75 text-emerald-300',
    jpg: 'border-slate-400/25 bg-slate-950/75 text-slate-300',
  };
  return (
    <span
      className={cn(
        'rounded border px-1.5 py-0.5 font-mono text-[11px] font-bold tracking-wide backdrop-blur',
        styles[format]
      )}
    >
      {format.toUpperCase()}
    </span>
  );
}
