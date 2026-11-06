import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent } from 'react';
import {
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  Code2,
  FileCode,
  Gauge,
  Info,
  Key,
  Link2,
  Monitor,
  Moon,
  PanelLeftClose,
  Play,
  RotateCcw,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Square,
  Sun,
  Tag,
  Trash2,
  X,
} from 'lucide-react';
import {
  FORMAT_OPTIONS,
  MAX_HEIGHT,
  MAX_URLS,
  MAX_WIDTH,
  MIN_HEIGHT,
  MIN_WIDTH,
  NAMING_PRESETS,
  NAMING_TOKENS,
  QUICK_PRESETS,
  VIEWPORT_PRESETS,
  clamp,
  countDuplicates,
  dedupeUrls,
  previewFileName,
  type CaptureSettings,
  type ColorScheme,
  type OutputFormat,
} from '../lib/snapper';
import { cn, Spinner, Switch } from './ui';

export type TabId = 'links' | 'viewport' | 'output' | 'advanced';

export const CONFIG_TABS: Array<{ id: TabId; label: string; icon: typeof Link2 }> = [
  { id: 'links', label: 'Links', icon: Link2 },
  { id: 'viewport', label: 'Viewport', icon: Monitor },
  { id: 'output', label: 'Saída', icon: FileCode },
  { id: 'advanced', label: 'Avançado', icon: SlidersHorizontal },
];

const FORMAT_TONE = {
  amber: 'border-amber-400/25 bg-amber-400/10 text-amber-300',
  rose: 'border-rose-400/25 bg-rose-400/10 text-rose-300',
  emerald: 'border-emerald-400/25 bg-emerald-400/10 text-emerald-300',
  slate: 'border-slate-400/20 bg-slate-400/10 text-slate-300',
} as const;

const HERO_OPTIONS = [
  { label: '1s', value: 1000 },
  { label: '2s', value: 2000 },
  { label: '3.5s', value: 3500 },
  { label: '5s', value: 5000 },
];

const DELAY_OPTIONS = [
  { label: '0.5s', value: 500 },
  { label: '1.2s', value: 1200 },
  { label: '2s', value: 2000 },
  { label: '3s', value: 3000 },
];

const SCHEME_OPTIONS: Array<{
  id: ColorScheme;
  label: string;
  icon: typeof Monitor;
}> = [
  { id: 'no-preference', label: 'Sistema', icon: Monitor },
  { id: 'light', label: 'Claro', icon: Sun },
  { id: 'dark', label: 'Escuro', icon: Moon },
];

interface ConfigPanelProps {
  settings: CaptureSettings;
  onChange: (patch: Partial<CaptureSettings>) => void;
  rawUrls: string;
  onRawUrlsChange: (value: string) => void;
  onClearUrls: () => void;
  urls: string[];
  isRunning: boolean;
  tab: TabId;
  onTabChange: (tab: TabId) => void;
  onRun: () => void;
  onStop: () => void;
  onReset: () => void;
  onClose?: () => void;
  onCollapse?: () => void;
}

export function ConfigPanel({
  settings,
  onChange,
  rawUrls,
  onRawUrlsChange,
  onClearUrls,
  urls,
  isRunning,
  tab,
  onTabChange,
  onRun,
  onStop,
  onReset,
  onClose,
  onCollapse,
}: ConfigPanelProps) {
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const duplicates = countDuplicates(urls);
  const overLimit = urls.length > MAX_URLS;
  const canRun = urls.length > 0 && !overLimit;
  const formatLabel =
    FORMAT_OPTIONS.find((option) => option.id === settings.format)?.label ?? 'WebP';

  const handleTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
    event.preventDefault();
    const direction = event.key === 'ArrowRight' ? 1 : -1;
    const nextIndex = (index + direction + CONFIG_TABS.length) % CONFIG_TABS.length;
    onTabChange(CONFIG_TABS[nextIndex].id);
    tabRefs.current[nextIndex]?.focus();
  };

  return (
    <section
      id="config-panel"
      className="flex h-full min-h-0 flex-col bg-[#080b12]"
      aria-label="Configuração da captura"
    >
      {/* Header */}
      <div className="shrink-0 border-b border-white/[0.06] px-4 pb-3 pt-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] border border-amber-400/25 bg-gradient-to-b from-amber-400/[0.16] to-amber-400/[0.04] text-amber-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
              <SlidersHorizontal className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <h2 className="truncate text-[15px] font-bold tracking-[-0.01em] text-white">
                Configuração do lote
              </h2>
              <p className="mt-0.5 truncate text-[12px] text-slate-400">
                Fila, viewport e formato de saída.
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-0.5">
            {onCollapse && (
              <button
                type="button"
                onClick={onCollapse}
                className="btn btn-ghost btn-icon hidden h-7 w-7 text-slate-400 hover:text-slate-200 lg:inline-flex"
                title="Recolher configuração"
                aria-label="Recolher configuração"
                aria-controls="config-panel"
                aria-expanded="true"
              >
                <PanelLeftClose className="h-4 w-4" />
              </button>
            )}
            <button
              type="button"
              onClick={onReset}
              disabled={isRunning}
              className="btn btn-ghost btn-icon h-7 w-7 text-slate-400 hover:text-slate-200"
              title="Restaurar configurações padrão"
              aria-label="Restaurar configurações padrão"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="btn btn-ghost btn-icon h-7 w-7 text-slate-400 hover:text-white lg:hidden"
                aria-label="Fechar configuração"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div
          role="tablist"
          aria-label="Seções de configuração"
          className="mt-3.5 grid grid-cols-4 gap-1 rounded-lg border border-white/[0.06] bg-black/30 p-1"
        >
          {CONFIG_TABS.map((item, index) => {
            const Icon = item.icon;
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                ref={(node) => {
                  tabRefs.current[index] = node;
                }}
                type="button"
                role="tab"
                id={`config-tab-${item.id}`}
                aria-selected={active}
                aria-controls="config-tabpanel"
                tabIndex={active ? 0 : -1}
                onClick={() => onTabChange(item.id)}
                onKeyDown={(event) => handleTabKeyDown(event, index)}
                className={cn(
                  'relative flex items-center justify-center gap-1.5 rounded-md px-1.5 py-1.5 text-[12.5px] font-semibold transition-colors',
                  active
                    ? 'bg-white/[0.08] text-white shadow-sm ring-1 ring-white/10'
                    : 'text-slate-400 hover:bg-white/[0.03] hover:text-slate-300'
                )}
              >
                <Icon
                  className={cn('h-3.5 w-3.5', active ? 'text-amber-400' : 'text-slate-400')}
                />
                <span>{item.label}</span>
                {item.id === 'advanced' &&
                  (settings.customHeaders.trim() || settings.customCookies.trim()) && (
                    <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Panels */}
      <div
        role="tabpanel"
        id="config-tabpanel"
        aria-labelledby={`config-tab-${tab}`}
        className="scroll-area min-h-0 flex-1 overflow-y-auto px-4 py-4"
      >
        <div key={tab} className="anim-in">
          {tab === 'links' && (
            <LinksTab
              rawUrls={rawUrls}
              onRawUrlsChange={onRawUrlsChange}
              onClearUrls={onClearUrls}
              urls={urls}
              duplicates={duplicates}
              overLimit={overLimit}
              isRunning={isRunning}
            />
          )}

          {tab === 'viewport' && (
            <ViewportTab settings={settings} onChange={onChange} isRunning={isRunning} />
          )}

          {tab === 'output' && (
            <OutputTab settings={settings} onChange={onChange} isRunning={isRunning} />
          )}

          {tab === 'advanced' && (
            <AdvancedTab settings={settings} onChange={onChange} isRunning={isRunning} />
          )}
        </div>
      </div>

      {/* Footer / run bar */}
      <div className="shrink-0 border-t border-white/[0.06] bg-[#070a11]/80 px-4 py-3.5">
        <div className="mb-2.5 flex items-center justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            <span className={cn('chip', canRun ? 'chip-amber' : '')}>
              <Link2 />
              {urls.length} {urls.length === 1 ? 'link' : 'links'}
            </span>
            <span className="chip">{formatLabel}</span>
            <span className="chip font-mono">
              {settings.width}×{settings.height}
            </span>
            <span className="chip hidden 2xl:inline-flex">
              {settings.fullPage ? 'Full-page' : 'Viewport'}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={isRunning ? onStop : onRun}
          disabled={!isRunning && !canRun}
          className={cn(
            'btn w-full py-2.5',
            isRunning
              ? 'border-rose-400/40 bg-rose-600 text-white hover:bg-rose-500'
              : 'btn-primary'
          )}
        >
          {isRunning ? (
            <>
              <Square className="h-4 w-4 fill-current" />
              <span>Interromper captura</span>
              <Spinner className="ml-1 h-3.5 w-3.5 opacity-80" />
            </>
          ) : (
            <>
              <Play className="h-4 w-4 fill-current" />
              <span>
                Capturar {urls.length} {urls.length === 1 ? 'link' : 'links'}
              </span>
            </>
          )}
        </button>

      </div>
    </section>
  );
}

/* ---------------------------------- Links --------------------------------- */

function LinksTab({
  rawUrls,
  onRawUrlsChange,
  onClearUrls,
  urls,
  duplicates,
  overLimit,
  isRunning,
}: {
  rawUrls: string;
  onRawUrlsChange: (value: string) => void;
  onClearUrls: () => void;
  urls: string[];
  duplicates: number;
  overLimit: boolean;
  isRunning: boolean;
}) {
  return (
    <div className="space-y-3.5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <label htmlFor="url-list" className="label">
            URLs de destino
          </label>
          <p className="mt-1 text-[12.5px] leading-relaxed text-slate-400">
            Uma URL por linha — o protocolo é detectado automaticamente.
          </p>
        </div>
        <span className={cn('chip', overLimit && 'chip-rose')}>
          {urls.length} / {MAX_URLS}
        </span>
      </div>

      <div className="relative">
        <textarea
          id="url-list"
          value={rawUrls}
          onChange={(event) => onRawUrlsChange(event.target.value)}
          placeholder={'exemplo.com\nhttps://github.com\nuol.com.br'}
          rows={8}
          spellCheck={false}
          autoCapitalize="none"
          autoCorrect="off"
          disabled={isRunning}
          aria-describedby="url-list-hint"
          className="field h-[190px] w-full resize-none px-3.5 py-3 font-mono text-[14.5px] leading-[1.85] text-slate-200 placeholder:text-slate-400"
        />
        <div className="pointer-events-none absolute bottom-2.5 right-3 flex items-center gap-1.5 rounded-md bg-[#070b12]/80 px-1.5 py-0.5 font-mono text-[11.5px] text-slate-400 backdrop-blur">
          <span className={cn(urls.length > 0 ? 'text-amber-400/90' : '')}>{urls.length}</span>
          <span>linhas</span>
        </div>
      </div>

      {(duplicates > 0 || overLimit) && (
        <div
          className={cn(
            'flex items-start justify-between gap-3 rounded-xl border px-3 py-2 text-[12.5px]',
            overLimit
              ? 'border-rose-400/25 bg-rose-400/[0.06] text-rose-200'
              : 'border-amber-400/20 bg-amber-400/[0.06] text-amber-200'
          )}
        >
          <span className="flex items-start gap-2 leading-relaxed">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {overLimit
              ? `Limite de ${MAX_URLS} URLs por lote. Reduza a lista para continuar.`
              : `${duplicates} ${duplicates === 1 ? 'URL duplicada' : 'URLs duplicadas'} na lista.`}
          </span>
          {!overLimit && duplicates > 0 && (
            <button
              type="button"
              onClick={() => onRawUrlsChange(dedupeUrls(urls).join('\n'))}
              disabled={isRunning}
              className="shrink-0 font-semibold underline decoration-amber-400/40 underline-offset-2 hover:text-white"
            >
              Remover
            </button>
          )}
        </div>
      )}

      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[12px] font-semibold uppercase tracking-[0.12em] text-slate-400">
            Presets rápidos
          </span>
          <button
            type="button"
            onClick={onClearUrls}
            disabled={isRunning || rawUrls.length === 0}
            className="flex items-center gap-1 text-[12.5px] font-medium text-slate-400 transition-colors hover:text-rose-300 disabled:opacity-40"
          >
            <Trash2 className="h-3 w-3" />
            Limpar lista
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {QUICK_PRESETS.map((preset) => {
            const Icon = preset.icon;
            return (
              <button
                key={preset.name}
                type="button"
                title={preset.hint}
                onClick={() => onRawUrlsChange(preset.urls)}
                disabled={isRunning}
                className="group inline-flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.02] px-2.5 py-1.5 text-[12.5px] font-medium text-slate-400 transition-colors hover:border-amber-400/30 hover:bg-amber-400/[0.06] hover:text-amber-200 disabled:opacity-50"
              >
                <Icon className="h-3.5 w-3.5 text-slate-400 transition-colors group-hover:text-amber-400" />
                {preset.name}
              </button>
            );
          })}
        </div>
      </div>

      <p id="url-list-hint" className="text-[12px] leading-relaxed text-slate-400">
        <Code2 className="mr-1 inline h-3 w-3 align-[-2px]" />
        Aceita domínios sem protocolo, rotas internas e parâmetros de query.
      </p>
    </div>
  );
}

function DimensionField({
  label,
  value,
  min,
  max,
  disabled,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  disabled: boolean;
  onChange: (value: number) => void;
}) {
  const [draft, setDraft] = useState(String(value));

  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  const commit = () => {
    const parsed = Number(draft);
    const next = clamp(Number.isFinite(parsed) && parsed > 0 ? parsed : min, min, max);
    setDraft(String(next));
    onChange(next);
  };

  return (
    <label className="block">
      <span className="mb-1 block text-[12px] font-medium text-slate-400">{label}</span>
      <span className="field flex items-center">
        <input
          type="number"
          inputMode="numeric"
          value={draft}
          onChange={(event) => {
            const raw = event.target.value;
            setDraft(raw);
            const parsed = Number(raw);
            if (raw.trim() !== '' && Number.isFinite(parsed) && parsed >= min && parsed <= max) {
              onChange(parsed);
            }
          }}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === 'Enter') event.currentTarget.blur();
          }}
          min={min}
          max={max}
          disabled={disabled}
          className="w-full bg-transparent px-2.5 py-2 font-mono text-[14px] text-slate-200 focus:outline-none"
        />
        <span className="pr-2.5 font-mono text-[11.5px] text-slate-400">px</span>
      </span>
    </label>
  );
}

/* --------------------------------- Viewport -------------------------------- */

function ViewportTab({
  settings,
  onChange,
  isRunning,
}: {
  settings: CaptureSettings;
  onChange: (patch: Partial<CaptureSettings>) => void;
  isRunning: boolean;
}) {
  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center justify-between">
          <span className="label">Resolução emulada</span>
          <span className="font-mono text-[12px] text-slate-400">
            {settings.width} × {settings.height}
          </span>
        </div>
        <div
          role="radiogroup"
          aria-label="Presets de viewport"
          className="mt-2 grid grid-cols-2 gap-2"
        >
          {VIEWPORT_PRESETS.map((preset) => {
            const Icon = preset.icon;
            const active = settings.presetId === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                role="radio"
                aria-checked={active}
                data-active={active}
                onClick={() =>
                  onChange({
                    presetId: preset.id,
                    width: preset.width,
                    height: preset.height,
                  })
                }
                disabled={isRunning}
                className="option-card p-2.5"
              >
                <div className="flex items-start justify-between">
                  <Icon
                    className={cn('h-4 w-4', active ? 'text-amber-400' : 'text-slate-400')}
                  />
                  <span
                    className={cn(
                      'flex h-4 w-4 items-center justify-center rounded-full border transition-colors',
                      active
                        ? 'border-amber-400 bg-amber-400 text-[#1b1305]'
                        : 'border-white/10'
                    )}
                  >
                    {active && <Check className="h-2.5 w-2.5" strokeWidth={3} />}
                  </span>
                </div>
                <span className="mt-2 block truncate text-[13px] font-semibold text-slate-200">
                  {preset.name}
                </span>
                <span className="mt-0.5 block font-mono text-[11px] text-slate-400">
                  {preset.desc}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center gap-1.5">
          <span className="label">Dimensões personalizadas</span>
          {settings.presetId === 'custom' && <span className="chip chip-amber">manual</span>}
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <DimensionField
            label="Largura"
            value={settings.width}
            min={MIN_WIDTH}
            max={MAX_WIDTH}
            disabled={isRunning}
            onChange={(width) => onChange({ width, presetId: 'custom' })}
          />
          <DimensionField
            label="Altura"
            value={settings.height}
            min={MIN_HEIGHT}
            max={MAX_HEIGHT}
            disabled={isRunning}
            onChange={(height) => onChange({ height, presetId: 'custom' })}
          />
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="label">Preferência de tema</span>
          <span className="text-[11.5px] text-slate-400">prefers-color-scheme</span>
        </div>
        <div
          role="radiogroup"
          aria-label="Preferência de tema da página"
          className="grid grid-cols-3 gap-1 rounded-xl border border-white/[0.06] bg-black/25 p-1"
        >
          {SCHEME_OPTIONS.map((option) => {
            const Icon = option.icon;
            const active = settings.colorScheme === option.id;
            return (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => onChange({ colorScheme: option.id })}
                disabled={isRunning}
                className={cn(
                  'flex items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-[12.5px] font-semibold transition-colors',
                  active
                    ? 'bg-white/[0.08] text-white shadow-sm ring-1 ring-white/10'
                    : 'text-slate-400 hover:text-slate-300'
                )}
              >
                <Icon className={cn('h-3.5 w-3.5', active ? 'text-amber-400' : '')} />
                {option.label}
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-[12px] leading-relaxed text-slate-400">
          Sites com suporte a dark mode são renderizados no tema escolhido.
        </p>
      </div>

      <div className="flex items-start gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
        <p className="text-[12px] leading-relaxed text-slate-400">
          A largura define o layout responsivo; a altura é o viewport antes do full-page.
        </p>
      </div>
    </div>
  );
}

/* ---------------------------------- Output --------------------------------- */

function OutputTab({
  settings,
  onChange,
  isRunning,
}: {
  settings: CaptureSettings;
  onChange: (patch: Partial<CaptureSettings>) => void;
  isRunning: boolean;
}) {
  const qualityEnabled = settings.format === 'webp' || settings.format === 'jpg';
  const qualityProgress = ((settings.quality - 20) / 80) * 100;
  const namingRef = useRef<HTMLInputElement>(null);
  const sampleName = previewFileName(settings);

  const insertToken = (token: string) => {
    const input = namingRef.current;
    const current = settings.namingPattern;
    if (!input) {
      onChange({ namingPattern: `${current}${token}` });
      return;
    }
    const start = input.selectionStart ?? current.length;
    const end = input.selectionEnd ?? start;
    const next = `${current.slice(0, start)}${token}${current.slice(end)}`;
    onChange({ namingPattern: next });
    requestAnimationFrame(() => {
      input.focus();
      input.setSelectionRange(start + token.length, start + token.length);
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="label">Formato de saída</span>
          <span className="text-[11.5px] text-slate-400">1 arquivo por URL</span>
        </div>
        <div role="radiogroup" aria-label="Formato de saída" className="grid grid-cols-2 gap-2">
          {FORMAT_OPTIONS.map((option) => {
            const Icon = option.icon;
            const active = settings.format === option.id;
            return (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={active}
                data-active={active}
                onClick={() => onChange({ format: option.id as OutputFormat })}
                disabled={isRunning}
                className="option-card p-2.5"
              >
                <div className="flex items-start justify-between">
                  <span
                    className={cn(
                      'flex h-7 w-7 items-center justify-center rounded-lg border',
                      active ? FORMAT_TONE[option.tone] : 'border-white/[0.08] bg-white/[0.03] text-slate-400'
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <span
                    className={cn(
                      'flex h-4 w-4 items-center justify-center rounded-full border transition-colors',
                      active
                        ? 'border-amber-400 bg-amber-400 text-[#1b1305]'
                        : 'border-white/10'
                    )}
                  >
                    {active && <Check className="h-2.5 w-2.5" strokeWidth={3} />}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <span className="text-[14px] font-bold text-slate-100">{option.label}</span>
                  {option.badge && (
                    <span
                      className={cn(
                        'rounded px-1 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em]',
                        option.badge === 'Vetorial'
                          ? 'bg-rose-400/10 text-rose-300 ring-1 ring-rose-400/20'
                          : 'bg-amber-400/10 text-amber-300 ring-1 ring-amber-400/20'
                      )}
                    >
                      {option.badge}
                    </span>
                  )}
                </div>
                <span className="mt-0.5 block text-[11.5px] leading-snug text-slate-400">
                  {option.note}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className={cn(!qualityEnabled && 'opacity-55')}>
        <div className="mb-1 flex items-center justify-between">
          <label htmlFor="quality" className="label">
            Qualidade / compressão
          </label>
          <span
            className={cn(
              'font-mono text-[14px] font-semibold',
              qualityEnabled ? 'text-amber-300' : 'text-slate-400'
            )}
          >
            {qualityEnabled ? `${settings.quality}%` : '—'}
          </span>
        </div>
        <input
          id="quality"
          type="range"
          min={20}
          max={100}
          step={1}
          value={settings.quality}
          disabled={isRunning || !qualityEnabled}
          onChange={(event) => onChange({ quality: Number(event.target.value) })}
          className="range"
          style={{ '--range-progress': `${qualityProgress}%` } as CSSProperties}
        />
        <p className="mt-0.5 text-[12px] leading-relaxed text-slate-400">
          {qualityEnabled
            ? 'Valores menores geram arquivos mais leves; 85% mantém texto nítido.'
            : 'PNG e PDF são sem perdas — a compressão não se aplica.'}
        </p>
      </div>

      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <label htmlFor="naming-pattern" className="label flex items-center gap-1.5">
            <Tag className="h-3 w-3" />
            Nomenclatura do arquivo
          </label>
          <span className="text-[11.5px] text-slate-400">tokens dinâmicos</span>
        </div>
        <input
          ref={namingRef}
          id="naming-pattern"
          type="text"
          value={settings.namingPattern}
          onChange={(event) => onChange({ namingPattern: event.target.value })}
          onBlur={() => {
            if (!settings.namingPattern.trim()) {
              onChange({ namingPattern: '[ordem]_[url]_[resolucao]' });
            }
          }}
          disabled={isRunning}
          placeholder="[ordem]_[url]_[resolucao]"
          spellCheck={false}
          className="field w-full px-3 py-2 font-mono text-[13px] text-amber-200/90 placeholder:text-slate-400"
        />

        <div className="mt-2 flex flex-wrap items-center gap-1">
          <span className="mr-0.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-400">
            Tokens
          </span>
          {NAMING_TOKENS.map((token) => (
            <button
              key={token}
              type="button"
              onClick={() => insertToken(token)}
              disabled={isRunning}
              className="rounded border border-white/[0.08] bg-white/[0.03] px-1.5 py-0.5 font-mono text-[11px] text-slate-400 transition-colors hover:border-amber-400/30 hover:text-amber-300 disabled:opacity-50"
            >
              {token}
            </button>
          ))}
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-1">
          <span className="mr-0.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-400">
            Modelos
          </span>
          {NAMING_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => onChange({ namingPattern: preset })}
              disabled={isRunning}
              title={`Usar ${preset}`}
              className={cn(
                'rounded border px-1.5 py-0.5 font-mono text-[11px] transition-colors disabled:opacity-50',
                settings.namingPattern === preset
                  ? 'border-amber-400/30 bg-amber-400/[0.08] text-amber-300'
                  : 'border-white/[0.08] text-slate-400 hover:text-slate-300'
              )}
            >
              {preset}
            </button>
          ))}
        </div>

        <div className="mt-2.5 flex items-center gap-2 overflow-hidden rounded-lg border border-white/[0.06] bg-black/25 px-2.5 py-2">
          <FileCode className="h-3.5 w-3.5 shrink-0 text-amber-400/80" />
          <span className="mr-1 shrink-0 text-[11.5px] text-slate-400">Prévia</span>
          <span className="truncate font-mono text-[12px] text-slate-300" title={sampleName}>
            {sampleName}
          </span>
        </div>
        <p className="mt-2 text-[11.5px] leading-relaxed text-slate-400">
          O nome final pode ser ajustado em cada captura no canvas, antes do download.
        </p>
      </div>
    </div>
  );
}

/* --------------------------------- Advanced -------------------------------- */

function AdvancedTab({
  settings,
  onChange,
  isRunning,
}: {
  settings: CaptureSettings;
  onChange: (patch: Partial<CaptureSettings>) => void;
  isRunning: boolean;
}) {
  const [showAuth, setShowAuth] = useState(
    Boolean(settings.customHeaders.trim() || settings.customCookies.trim())
  );
  const authConfigured = Boolean(settings.customHeaders.trim() || settings.customCookies.trim());

  return (
    <div className="space-y-4">
      <div>
        <div className="mb-2.5 flex items-center gap-1.5">
          <Gauge className="h-3.5 w-3.5 text-amber-400" />
          <span className="label">Comportamento de captura</span>
        </div>
        <div className="divide-y divide-white/[0.055] overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.015]">
          <Switch
            checked={settings.fullPage}
            onChange={(checked) => onChange({ fullPage: checked })}
            disabled={isRunning}
            label="Full-page contínuo"
            description="Captura a página inteira, sem quebra de seções."
          />
          <Switch
            checked={settings.autoScroll}
            onChange={(checked) => onChange({ autoScroll: checked })}
            disabled={isRunning}
            label="Auto-scroll progressivo"
            description="Ativa lazy loads, animações e seções ocultas."
          />
          <Switch
            checked={settings.hideCookieBanners}
            onChange={(checked) => onChange({ hideCookieBanners: checked })}
            disabled={isRunning}
            label="Remover banners e pop-ups"
            description="Oculta cookies, newsletters e modais de login que cobrem o conteúdo."
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <span className="label flex items-center gap-1.5">
              <Clock className="h-3 w-3" />
              Pausa hero
            </span>
            <span className="font-mono text-[11.5px] text-amber-300">
              {(settings.heroWaitMs / 1000).toFixed(1)}s
            </span>
          </div>
          <div className="grid grid-cols-4 gap-1 rounded-lg border border-white/[0.06] bg-black/25 p-1">
            {HERO_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => onChange({ heroWaitMs: option.value })}
                disabled={isRunning}
                className={cn(
                  'rounded-md py-1 font-mono text-[11.5px] transition-colors',
                  settings.heroWaitMs === option.value
                    ? 'bg-amber-400/15 font-bold text-amber-300'
                    : 'text-slate-400 hover:text-slate-300'
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <span className="label flex items-center gap-1.5">
              <Clock className="h-3 w-3" />
              Delay final
            </span>
            <span className="font-mono text-[11.5px] text-amber-300">
              {(settings.delayMs / 1000).toFixed(1)}s
            </span>
          </div>
          <div className="grid grid-cols-4 gap-1 rounded-lg border border-white/[0.06] bg-black/25 p-1">
            {DELAY_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => onChange({ delayMs: option.value })}
                disabled={isRunning}
                className={cn(
                  'rounded-md py-1 font-mono text-[11.5px] transition-colors',
                  settings.delayMs === option.value
                    ? 'bg-amber-400/15 font-bold text-amber-300'
                    : 'text-slate-400 hover:text-slate-300'
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div>
        <div className="mb-2.5 flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-amber-400" />
          <span className="label">Texturas & estabilização</span>
        </div>
        <div className="divide-y divide-white/[0.055] overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.015]">
          <Switch
            checked={settings.stabilizeTextures}
            onChange={(checked) => onChange({ stabilizeTextures: checked })}
            disabled={isRunning}
            label="Estabilizar texturas e parallax"
            description="Corrige rasgos e repetições de fundos fixos."
          />
          <Switch
            checked={settings.removeExcessGrain}
            onChange={(checked) => onChange({ removeExcessGrain: checked })}
            disabled={isRunning}
            label="Atenuar ruído / grain"
            description="Reduz filtros pesados que prejudicam a nitidez."
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.015]">
        <button
          type="button"
          onClick={() => setShowAuth((previous) => !previous)}
          aria-expanded={showAuth}
          className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left transition-colors hover:bg-white/[0.02]"
        >
          <span className="flex items-center gap-2">
            <Key className="h-3.5 w-3.5 text-amber-400" />
            <span className="text-[13px] font-semibold text-slate-300">
              Headers & cookies
            </span>
            {authConfigured ? (
              <span className="chip chip-emerald !py-0 !text-[10.5px]">configurado</span>
            ) : (
              <span className="text-[11.5px] text-slate-400">opcional</span>
            )}
          </span>
          {showAuth ? (
            <ChevronUp className="h-4 w-4 text-slate-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-slate-400" />
          )}
        </button>

        {showAuth && (
          <div className="anim-in space-y-3 border-t border-white/[0.06] p-3">
            <div>
              <label
                htmlFor="custom-headers"
                className="mb-1 block text-[12px] font-semibold text-slate-400"
              >
                Headers HTTP · uma linha por header
              </label>
              <textarea
                id="custom-headers"
                value={settings.customHeaders}
                onChange={(event) => onChange({ customHeaders: event.target.value })}
                placeholder={'Authorization: Bearer token\nX-Custom-Env: staging'}
                rows={3}
                spellCheck={false}
                disabled={isRunning}
                className="field w-full resize-none px-2.5 py-2 font-mono text-[12.5px] leading-relaxed text-slate-200 placeholder:text-slate-400"
              />
            </div>
            <div>
              <label
                htmlFor="custom-cookies"
                className="mb-1 block text-[12px] font-semibold text-slate-400"
              >
                Cookies de sessão
              </label>
              <textarea
                id="custom-cookies"
                value={settings.customCookies}
                onChange={(event) => onChange({ customCookies: event.target.value })}
                placeholder="session_id=abc123; auth_token=eyJ..."
                rows={2}
                spellCheck={false}
                disabled={isRunning}
                className="field w-full resize-none px-2.5 py-2 font-mono text-[12.5px] leading-relaxed text-slate-200 placeholder:text-slate-400"
              />
            </div>
            <p className="flex items-start gap-1.5 text-[11.5px] leading-relaxed text-slate-400">
              <ShieldCheck className="mt-0.5 h-3 w-3 shrink-0 text-emerald-500/60" />
              Credenciais ficam no navegador e são enviadas apenas ao Chromium local.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
