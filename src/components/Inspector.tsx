import { useEffect, useRef } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Copy,
  Download,
  ExternalLink,
  FileCode,
  Images,
  Link2,
  Maximize2,
  Monitor,
  Pencil,
  PanelRightClose,
  PanelRightOpen,
  RefreshCw,
  ScanLine,
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
  type RunProgress,
} from '../lib/snapper';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { cn, Spinner } from './ui';

interface InspectorProps {
  items: CapturedItem[];
  selectedId: string | null;
  isRunning: boolean;
  progress: RunProgress;
  elapsedMs: number;
  lastRun: LastRun | null;
  settings: CaptureSettings;
  urlCount: number;
  onSelect: (item: CapturedItem) => void;
  onPreview: (item: CapturedItem) => void;
  onDownload: (item: CapturedItem) => void;
  onCopy: (item: CapturedItem) => void;
  onRemove: (id: string) => void;
  onRetry: (item: CapturedItem) => void;
  onRename: (item: CapturedItem) => void;
  onCollapse?: () => void;
  className?: string;
}

const SCHEME_LABEL: Record<CaptureSettings['colorScheme'], string> = {
  'no-preference': 'Sistema',
  light: 'Claro',
  dark: 'Escuro',
};

export function Inspector({
  items,
  selectedId,
  isRunning,
  progress,
  elapsedMs,
  lastRun,
  settings,
  urlCount,
  onSelect,
  onPreview,
  onDownload,
  onCopy,
  onRemove,
  onRetry,
  onRename,
  onCollapse,
  className,
}: InspectorProps) {
  const selected = selectedId
    ? items.find((item) => item.id === selectedId) ?? null
    : null;
  const validItems = items.filter(isCaptured);
  const failedItems = items.filter(isFailed);
  const totalBytes = validItems.reduce((sum, item) => sum + (item.byteSize || 0), 0);
  const selectedIsError = Boolean(selected && isFailed(selected));
  const selectedIsPending = Boolean(selected && isPending(selected));

  return (
    <aside
      className={cn(
        'flex h-full min-h-0 w-[304px] shrink-0 flex-col border-l border-white/[0.06] bg-[#080b12]',
        className
      )}
      aria-label="Inspetor de capturas"
      id="inspector-panel"
    >
      <header className="flex h-[54px] shrink-0 items-center gap-2 border-b border-white/[0.06] px-4">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.03] text-slate-400">
          <Images className="h-3.5 w-3.5" />
        </span>
        <h2 className="text-[14.5px] font-bold tracking-[-0.01em] text-white">Inspetor</h2>
        <div className="ml-auto flex items-center gap-1">
          {selected ? (
            <span
              className={cn(
                'chip',
                selectedIsError
                  ? 'chip-rose'
                  : selectedIsPending
                    ? 'chip-blue'
                    : 'chip-amber'
              )}
            >
              {selectedIsError
                ? 'falha'
                : selectedIsPending
                  ? selected?.status === 'processing'
                    ? 'capturando'
                    : 'na fila'
                  : 'selecionada'}
            </span>
          ) : (
            <span className="chip">lote</span>
          )}
          {onCollapse && (
            <button
              type="button"
              onClick={onCollapse}
              className="btn btn-ghost btn-icon h-7 w-7 text-slate-400 hover:text-white"
              title="Retrair inspetor"
              aria-label="Retrair inspetor"
            >
              <PanelRightClose className="h-4 w-4" />
            </button>
          )}
        </div>
      </header>

      <div className="scroll-area min-h-0 flex-1 overflow-y-auto">
        {selected ? (
          selectedIsError ? (
            <ErrorDetails
              item={selected}
              isRunning={isRunning}
              onRetry={onRetry}
              onRemove={onRemove}
            />
          ) : selectedIsPending ? (
            <PendingDetails item={selected} />
          ) : (
            <CaptureDetails
              item={selected}
              items={items}
              onSelect={onSelect}
              onPreview={onPreview}
              onDownload={onDownload}
              onCopy={onCopy}
              onRemove={onRemove}
              onRename={onRename}
            />
          )
        ) : (
          <BatchOverview
            items={items}
            validCount={validItems.length}
            failedCount={failedItems.length}
            totalBytes={totalBytes}
            isRunning={isRunning}
            progress={progress}
            elapsedMs={elapsedMs}
            lastRun={lastRun}
            settings={settings}
            urlCount={urlCount}
            onSelect={onSelect}
          />
        )}
      </div>
    </aside>
  );
}

/* ------------------------------ Selected view ----------------------------- */

function CaptureDetails({
  item,
  items,
  onSelect,
  onPreview,
  onDownload,
  onCopy,
  onRemove,
  onRename,
}: {
  item: CapturedItem;
  items: CapturedItem[];
  onSelect: (item: CapturedItem) => void;
  onPreview: (item: CapturedItem) => void;
  onDownload: (item: CapturedItem) => void;
  onCopy: (item: CapturedItem) => void;
  onRemove: (id: string) => void;
  onRename: (item: CapturedItem) => void;
}) {
  const others = items
    .filter((candidate) => candidate.id !== item.id && !isPending(candidate))
    .slice(-3)
    .reverse();

  return (
    <div className="anim-in p-4">
      <button
        type="button"
        onClick={() => onPreview(item)}
        className="group relative block w-full overflow-hidden rounded-lg border border-white/[0.09] bg-[#060910]"
        aria-label={`Abrir prévia ampliada de ${hostOf(item.url)}`}
      >
        <span className="block aspect-[16/10] w-full">
          <img
            src={item.previewDataUrl}
            alt=""
            className="h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-[1.03]"
          />
        </span>
        <span className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all duration-200 group-hover:bg-black/35 group-hover:opacity-100">
          <span className="flex items-center gap-1.5 rounded-md border border-white/15 bg-black/65 px-2 py-1 text-[11.5px] font-semibold text-white backdrop-blur">
            <Maximize2 className="h-3 w-3 text-amber-400" />
            Ampliar
          </span>
        </span>
      </button>

      <div className="mt-3 flex items-start gap-2">
        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-emerald-400/20 bg-emerald-400/[0.08] text-emerald-300">
          <CheckCircle2 className="h-3.5 w-3.5" />
        </span>
        <div className="min-w-0 flex-1">
          <a
            href={hrefOf(item.url)}
            target="_blank"
            rel="noreferrer"
            className="group/link flex min-w-0 items-center gap-1 text-[14.5px] font-bold text-slate-100 transition-colors hover:text-amber-300"
            title={item.url}
          >
            <span className="truncate">
              {hostOf(item.url)}
              <span className="font-medium text-slate-400">{pathOf(item.url)}</span>
            </span>
            <ExternalLink className="h-3 w-3 shrink-0 text-slate-400 group-hover/link:text-amber-400" />
          </a>
          <p className="mt-0.5 truncate font-mono text-[11px] text-slate-400" title={item.url}>
            {item.url}
          </p>
        </div>
      </div>

      <dl className="mt-3.5 grid grid-cols-2 gap-1.5">
        <Stat label="Resolução" value={`${item.dimensions?.pageWidth} × ${item.dimensions?.pageHeight}`} />
        <Stat label="Peso" value={formatBytes(item.byteSize)} />
        <Stat label="Duração" value={formatDuration(item.durationMs)} />
        <Stat label="Formato" value={item.format.toUpperCase()} />
        <Stat label="Capturada" value={item.capturedAt} />
        {item.imgStats && item.imgStats.total > 0 ? (
          <Stat label="Imagens" value={`${item.imgStats.completed}/${item.imgStats.total}`} />
        ) : (
          <Stat label="Origem" value="página única" />
        )}
      </dl>

      <div className="mt-2 flex items-center gap-2 overflow-hidden rounded-lg border border-white/[0.06] bg-black/25 px-2.5 py-2">
        <FileCode className="h-3.5 w-3.5 shrink-0 text-amber-400/70" />
        <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-slate-400" title={item.fileName}>
          {item.fileName}
        </span>
        <button
          type="button"
          onClick={() => onRename(item)}
          aria-label="Renomear arquivo antes de baixar"
          title="Renomear arquivo"
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-slate-400 transition-colors hover:bg-white/[0.06] hover:text-amber-300"
        >
          <Pencil className="h-3 w-3" />
        </button>
      </div>

      <div className="mt-3 space-y-1.5">
        <button
          type="button"
          onClick={() => onPreview(item)}
          className="btn btn-primary w-full py-2"
        >
          <Maximize2 className="h-3.5 w-3.5" />
          Abrir prévia ampliada
        </button>
        <div className="grid grid-cols-2 gap-1.5">
          <button
            type="button"
            onClick={() => onDownload(item)}
            className="btn btn-secondary btn-sm"
          >
            <Download className="h-3.5 w-3.5 text-amber-300" />
            Baixar
          </button>
          <button
            type="button"
            onClick={() => onCopy(item)}
            disabled={item.format === 'pdf'}
            className="btn btn-secondary btn-sm"
            title={
              item.format === 'pdf'
                ? 'PDF não pode ser copiado como imagem'
                : 'Copiar imagem'
            }
          >
            <Copy className="h-3.5 w-3.5 text-slate-400" />
            Copiar
          </button>
        </div>
        <div className="flex items-center gap-1">
          <a
            href={hrefOf(item.url)}
            target="_blank"
            rel="noreferrer"
            className="btn btn-ghost btn-sm flex-1 text-slate-400 hover:text-slate-200"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Abrir site
          </a>
          <button
            type="button"
            onClick={() => onRemove(item.id)}
            className="btn btn-ghost btn-sm text-slate-400 hover:text-rose-300"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Remover
          </button>
        </div>
      </div>

      {others.length > 0 && (
        <div className="mt-4 border-t border-white/[0.06] pt-3">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
            No lote
          </p>
          <div className="space-y-1">
            {others.map((other) => (
              <button
                key={other.id}
                type="button"
                onClick={() => onSelect(other)}
                className="flex w-full items-center gap-2 rounded-md px-1.5 py-1.5 text-left transition-colors hover:bg-white/[0.04]"
              >
                <span className="h-6 w-9 shrink-0 overflow-hidden rounded border border-white/[0.08] bg-[#060910]">
                  {other.previewDataUrl ? (
                    <img
                      src={other.previewDataUrl}
                      alt=""
                      className="h-full w-full object-cover object-top"
                    />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center text-rose-400/60">
                      <AlertTriangle className="h-2.5 w-2.5" />
                    </span>
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[12.5px] font-medium text-slate-300">
                    {hostOf(other.url)}
                  </span>
                  <span className="block truncate font-mono text-[10.5px] text-slate-400">
                    {other.capturedAt}
                  </span>
                </span>
                {isFailed(other) ? (
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-rose-400/80" />
                ) : (
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400/80" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PendingDetails({ item }: { item: CapturedItem }) {
  const isCurrent = item.status === 'processing';
  return (
    <div className="anim-in p-4">
      <div
        className={cn(
          'flex items-start gap-2.5 rounded-lg border px-3 py-2.5',
          isCurrent
            ? 'border-amber-400/20 bg-amber-400/[0.06]'
            : 'border-sky-400/20 bg-sky-400/[0.05]'
        )}
      >
        <span
          className={cn(
            'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border',
            isCurrent
              ? 'border-amber-400/25 bg-amber-400/[0.08] text-amber-300'
              : 'border-sky-400/20 bg-sky-400/[0.08] text-sky-300'
          )}
        >
          {isCurrent ? <Spinner className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
        </span>
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-white">
            {isCurrent ? 'Capturando agora' : 'Aguardando na fila'}
          </p>
          <p className="mt-0.5 text-[11.5px] leading-relaxed text-slate-400">
            {isCurrent
              ? stepLabel(item.step || 'running')
              : 'Esta URL será processada na sequência, respeitando a ordem do lote.'}
          </p>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2 overflow-hidden rounded-lg border border-white/[0.06] bg-black/25 px-2.5 py-2">
        <Link2 className="h-3.5 w-3.5 shrink-0 text-slate-400" />
        <span className="truncate font-mono text-[11px] text-slate-400" title={item.url}>
          {item.url}
        </span>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-1.5">
        <Stat label="Posição" value={`#${item.index + 1}`} />
        <Stat label="Formato" value={item.format.toUpperCase()} />
        <Stat
          label="Viewport"
          value={`${item.dimensions?.pageWidth ?? '—'} × ${item.dimensions?.pageHeight || '—'}`}
        />
        <Stat
          label="Status"
          value={isCurrent ? 'Capturando' : 'Na fila'}
          accent={!isCurrent}
        />
      </dl>

      <p className="mt-3 rounded-lg border border-white/[0.06] bg-white/[0.015] px-2.5 py-2 text-[11.5px] leading-relaxed text-slate-400">
        Quando a captura terminar, este painel troca automaticamente para os metadados, a
        prévia ampliada e as ações de download.
      </p>
    </div>
  );
}

function ErrorDetails({
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
    <div className="anim-in p-4">
      <div className="flex items-start gap-2.5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-rose-400/20 bg-rose-400/[0.08] text-rose-300">
          <AlertTriangle className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-semibold text-slate-100">
            {hostOf(item.url)}
            <span className="font-normal text-slate-400">{pathOf(item.url)}</span>
          </p>
          <p className="mt-0.5 font-mono text-[10.5px] text-slate-400">{item.capturedAt}</p>
        </div>
      </div>

      <p className="mt-3 break-words rounded-lg border border-rose-400/15 bg-rose-400/[0.05] px-3 py-2.5 font-mono text-[11.5px] leading-relaxed text-rose-200/80">
        {item.error || 'A página retornou 0 bytes por limites de renderização.'}
      </p>

      <div className="mt-3 flex items-center gap-2 overflow-hidden rounded-lg border border-white/[0.06] bg-black/25 px-2.5 py-2">
        <Link2 className="h-3.5 w-3.5 shrink-0 text-slate-400" />
        <span className="truncate font-mono text-[11px] text-slate-400" title={item.url}>
          {item.url}
        </span>
      </div>

      <button
        type="button"
        onClick={() => onRetry(item)}
        disabled={isRunning}
        className="btn btn-primary mt-3 w-full py-2"
      >
        <RefreshCw className="h-3.5 w-3.5" />
        Tentar novamente
      </button>
      <button
        type="button"
        onClick={() => onRemove(item.id)}
        className="btn btn-ghost btn-sm mt-1.5 w-full text-slate-400 hover:text-rose-300"
      >
        <Trash2 className="h-3.5 w-3.5" />
        Remover do lote
      </button>
    </div>
  );
}

/* ------------------------------ Overview view ----------------------------- */

function BatchOverview({
  items,
  validCount,
  failedCount,
  totalBytes,
  isRunning,
  progress,
  elapsedMs,
  lastRun,
  settings,
  urlCount,
  onSelect,
}: {
  items: CapturedItem[];
  validCount: number;
  failedCount: number;
  totalBytes: number;
  isRunning: boolean;
  progress: RunProgress;
  elapsedMs: number;
  lastRun: LastRun | null;
  settings: CaptureSettings;
  urlCount: number;
  onSelect: (item: CapturedItem) => void;
}) {
  const recent = items.slice(-5).reverse();

  const state = isRunning
    ? {
        icon: ScanLine,
        title: `Capturando ${Math.min(progress.finished + 1, progress.total)} de ${progress.total}`,
        subtitle: stepLabel(progress.step),
        tone: 'border-amber-400/20 bg-amber-400/[0.06] text-amber-300',
      }
    : lastRun
      ? {
          icon: lastRun.failed > 0 ? AlertTriangle : CheckCircle2,
          title: lastRun.failed > 0 ? 'Lote com ocorrências' : 'Lote concluído',
          subtitle: `${lastRun.success} de ${lastRun.total} · ${formatClock(lastRun.durationMs)}`,
          tone:
            lastRun.failed > 0
              ? 'border-rose-400/20 bg-rose-400/[0.06] text-rose-300'
              : 'border-emerald-400/20 bg-emerald-400/[0.06] text-emerald-300',
        }
      : {
          icon: ScanLine,
          title: urlCount > 0 ? 'Pronto para capturar' : 'Aguardando URLs',
          subtitle:
            urlCount > 0
              ? `${urlCount} ${urlCount === 1 ? 'link na fila' : 'links na fila'}`
              : 'Cole as URLs no painel',
          tone: 'border-white/[0.08] bg-white/[0.03] text-slate-400',
        };
  const StateIcon = state.icon;

  return (
    <div className="anim-in p-4">
      <div className={cn('flex items-center gap-2.5 rounded-lg border px-3 py-2.5', state.tone)}>
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-white/10 bg-white/[0.03]">
          <StateIcon className="h-3.5 w-3.5" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold text-white">{state.title}</p>
          <p className="mt-0.5 truncate text-[11.5px] text-slate-400">{state.subtitle}</p>
        </div>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-1.5">
        <Stat label="Na fila" value={String(urlCount)} />
        <Stat label="No canvas" value={String(items.length)} />
        <Stat label="Prontas" value={String(validCount)} accent={validCount > 0} />
        <Stat label="Falhas" value={String(failedCount)} danger={failedCount > 0} />
      </dl>

      {isRunning && (
        <div className="mt-2">
          <div className="mb-1 flex items-center justify-between font-mono text-[10.5px] text-slate-400">
            <span>{formatClock(elapsedMs)} decorridos</span>
            <span>{progress.finished}/{progress.total}</span>
          </div>
          <div className="h-1 overflow-hidden rounded-full bg-white/[0.07]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-400 transition-[width] duration-500"
              style={{
                width: `${Math.max(
                  progress.total > 0 ? (progress.finished / progress.total) * 100 : 0,
                  2
                )}%`,
              }}
            />
          </div>
        </div>
      )}

      <div className="mt-4 border-t border-white/[0.06] pt-3">
        <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
          Ajustes ativos
        </p>
        <div className="space-y-1.5">
          <SummaryRow label="Formato" value={settings.format.toUpperCase()} />
          <SummaryRow
            label="Viewport"
            value={`${settings.width} × ${settings.height}`}
            mono
          />
          <SummaryRow
            label="Modo"
            value={settings.fullPage ? 'Full-page' : 'Viewport'}
          />
          <SummaryRow label="Tema" value={SCHEME_LABEL[settings.colorScheme]} />
          <SummaryRow label="Peso total" value={formatBytes(totalBytes)} mono />
        </div>
      </div>

      <div className="mt-4 border-t border-white/[0.06] pt-3">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
            Atividade
          </p>
          {items.length > 0 && (
            <span className="font-mono text-[10.5px] text-slate-400">{items.length} itens</span>
          )}
        </div>

        {recent.length === 0 ? (
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.015] px-3 py-3">
            <p className="text-[12px] leading-relaxed text-slate-400">
              As capturas aparecem aqui em tempo real. Selecione um artboard para inspecionar
              metadados e baixar o arquivo.
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {recent.map((item) => {
              const failed = isFailed(item);
              const pending = isPending(item);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelect(item)}
                  className="flex w-full items-center gap-2 rounded-md px-1.5 py-1.5 text-left transition-colors hover:bg-white/[0.04]"
                >
                  <span className="h-6 w-9 shrink-0 overflow-hidden rounded border border-white/[0.08] bg-[#060910]">
                    {!failed && !pending ? (
                      <img
                        src={item.previewDataUrl}
                        alt=""
                        className="h-full w-full object-cover object-top"
                      />
                    ) : pending ? (
                      <span className="flex h-full w-full items-center justify-center text-sky-400/70">
                        <Clock className="h-2.5 w-2.5" />
                      </span>
                    ) : (
                      <span className="flex h-full w-full items-center justify-center text-rose-400/60">
                        <AlertTriangle className="h-2.5 w-2.5" />
                      </span>
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12.5px] font-medium text-slate-300">
                      {hostOf(item.url)}
                    </span>
                    <span className="block truncate font-mono text-[10.5px] text-slate-400">
                      {pending
                        ? stepLabel(item.step || 'running')
                        : failed
                          ? 'falha'
                          : `${formatBytes(item.byteSize)} · ${item.capturedAt}`}
                    </span>
                  </span>
                  <span
                    className={cn(
                      'h-1.5 w-1.5 shrink-0 rounded-full',
                      pending
                        ? 'bg-sky-400/80'
                        : failed
                          ? 'bg-rose-400/80'
                          : 'bg-emerald-400/80'
                    )}
                  />
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-4 flex items-start gap-2 rounded-lg border border-white/[0.05] bg-white/[0.015] px-2.5 py-2">
        <Monitor className="mt-0.5 h-3 w-3 shrink-0 text-slate-400" />
        <p className="text-[11px] leading-relaxed text-slate-400">
          <span className="font-semibold text-slate-400">Ctrl + Enter</span> inicia o lote.
          Duplo clique em um artboard abre a prévia ampliada.
        </p>
      </div>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[12px] text-slate-400">{label}</span>
      <span
        className={cn(
          'truncate text-[12px] font-medium text-slate-300',
          mono && 'font-mono'
        )}
      >
        {value}
      </span>
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
  danger,
}: {
  label: string;
  value: string;
  accent?: boolean;
  danger?: boolean;
}) {
  return (
    <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-2.5 py-2">
      <dt className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-slate-400">
        {label}
      </dt>
      <dd
        className={cn(
          'mt-0.5 truncate font-mono text-[12.5px] font-medium text-slate-300',
          accent && 'text-emerald-300',
          danger && 'text-rose-300'
        )}
        title={value}
      >
        {value}
      </dd>
    </div>
  );
}


/* --------------------------------- Rail ---------------------------------- */

export function InspectorRail({
  itemCount,
  hasSelection,
  isRunning,
  onExpand,
}: {
  itemCount: number;
  hasSelection: boolean;
  isRunning: boolean;
  onExpand: () => void;
}) {
  return (
    <aside className="hidden w-[56px] shrink-0 border-l border-white/[0.06] bg-[#080b12] xl:flex">
      <button
        type="button"
        onClick={onExpand}
        className="group flex h-full w-full flex-col items-center gap-3 py-3 transition-colors hover:bg-white/[0.02]"
        title="Expandir inspetor"
        aria-label="Expandir inspetor"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.03] text-slate-400 transition-colors group-hover:border-white/[0.16] group-hover:text-white">
          <PanelRightOpen className="h-4 w-4" />
        </span>
        <span
          className={cn(
            'flex h-5 min-w-5 items-center justify-center rounded-full border px-1.5 font-mono text-[10.5px] font-semibold',
            hasSelection
              ? 'border-amber-400/25 bg-amber-400/[0.08] text-amber-300'
              : 'border-white/[0.08] bg-white/[0.03] text-slate-400'
          )}
          title={`${itemCount} ${itemCount === 1 ? 'captura' : 'capturas'}`}
        >
          {itemCount}
        </span>
        <span className="mt-auto [writing-mode:vertical-rl] rotate-180 text-[9.5px] font-bold uppercase tracking-[0.2em] text-slate-400 transition-colors group-hover:text-slate-300">
          Inspetor
        </span>
        <span
          aria-hidden="true"
          className={cn(
            'mb-1 h-1.5 w-1.5 rounded-full',
            hasSelection
              ? 'bg-amber-400'
              : isRunning
                ? 'animate-pulse bg-amber-400/70'
                : 'bg-emerald-400/70'
          )}
        />
      </button>
    </aside>
  );
}

/* ------------------------------- Drawer ---------------------------------- */

/**
 * Inspetor em drawer para telas menores que 1280 px. Mantém o mesmo conteúdo
 * do painel persistente, com foco contido e fechamento por Esc/backdrop.
 */
export function InspectorDrawer(props: InspectorProps & { onClose: () => void }) {
  const { onClose, ...inspectorProps } = props;
  const dialogRef = useRef<HTMLDivElement>(null);

  useFocusTrap(dialogRef);

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    dialogRef.current
      ?.querySelector<HTMLElement>(
        'button:not([disabled]), a[href], input:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
      ?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      previouslyFocused?.focus?.();
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 top-[54px] z-50">
      <div
        aria-hidden="true"
        onClick={onClose}
        className="absolute inset-0 bg-black/65 backdrop-blur-[2px]"
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Inspetor de capturas"
        className="absolute inset-y-0 right-0 flex w-[min(92vw,360px)] flex-col border-l border-white/[0.07] bg-[#080b12] shadow-2xl shadow-black/60"
      >
        <Inspector {...inspectorProps} onCollapse={onClose} className="w-full border-l-0" />
      </div>
    </div>
  );
}
