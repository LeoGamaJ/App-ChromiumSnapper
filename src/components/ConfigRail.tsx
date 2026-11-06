import { PanelLeftOpen, Play, Square } from 'lucide-react';
import { CONFIG_TABS, type TabId } from './ConfigPanel';
import { cn, Spinner } from './ui';

interface ConfigRailProps {
  activeTab: TabId;
  urlCount: number;
  canRun: boolean;
  isRunning: boolean;
  onTabChange: (tab: TabId) => void;
  onExpand: () => void;
  onRun: () => void;
  onStop: () => void;
}

export function ConfigRail({
  activeTab,
  urlCount,
  canRun,
  isRunning,
  onTabChange,
  onExpand,
  onRun,
  onStop,
}: ConfigRailProps) {
  return (
    <aside
      className="hidden w-[64px] shrink-0 flex-col items-center border-r border-white/[0.07] bg-[#080b12] py-3 lg:flex"
      aria-label="Configuração retraída"
    >
      <button
        type="button"
        onClick={onExpand}
        className="btn btn-ghost btn-icon h-8 w-8 text-slate-500 hover:text-white"
        title="Expandir configuração"
        aria-label="Expandir configuração"
      >
        <PanelLeftOpen className="h-4 w-4" />
      </button>

      <div className="mt-2 h-px w-8 bg-white/[0.06]" aria-hidden="true" />

      <div className="mt-2 flex flex-col items-center gap-1">
        {CONFIG_TABS.map((item) => {
          const Icon = item.icon;
          const active = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                onTabChange(item.id);
                onExpand();
              }}
              title={item.label}
              aria-label={`Expandir configuração: ${item.label}`}
              className={cn(
                'relative flex h-10 w-10 items-center justify-center rounded-lg border transition-colors',
                active
                  ? 'border-amber-400/30 bg-amber-400/[0.1] text-amber-300'
                  : 'border-transparent text-slate-500 hover:bg-white/[0.05] hover:text-slate-200'
              )}
            >
              <Icon className="h-[18px] w-[18px]" />
              {active && (
                <span
                  aria-hidden="true"
                  className="absolute -left-[9px] top-1/2 h-4 w-[2px] -translate-y-1/2 rounded-full bg-amber-400"
                />
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-auto flex flex-col items-center gap-2">
        <span
          className={cn(
            'flex h-5 min-w-5 items-center justify-center rounded-full border px-1.5 font-mono text-[10.5px] font-semibold',
            canRun
              ? 'border-amber-400/25 bg-amber-400/[0.08] text-amber-300'
              : 'border-white/[0.08] bg-white/[0.03] text-slate-500'
          )}
          title={`${urlCount} ${urlCount === 1 ? 'link na fila' : 'links na fila'}`}
        >
          {urlCount}
        </span>
        <button
          type="button"
          onClick={isRunning ? onStop : onRun}
          disabled={!isRunning && !canRun}
          className={cn(
            'btn h-10 w-10 rounded-lg p-0',
            isRunning
              ? 'border-rose-400/40 bg-rose-600 text-white hover:bg-rose-500'
              : 'btn-primary'
          )}
          title={isRunning ? 'Interromper captura' : 'Capturar lote'}
          aria-label={isRunning ? 'Interromper captura' : 'Capturar lote'}
        >
          {isRunning ? (
            <Spinner className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4 fill-current" />
          )}
        </button>
        <button
          type="button"
          onClick={onExpand}
          className="[writing-mode:vertical-rl] rotate-180 text-[9.5px] font-bold uppercase tracking-[0.2em] text-slate-600 transition-colors hover:text-slate-300"
          aria-label="Expandir configuração"
          tabIndex={-1}
        >
          Lote
        </button>
      </div>
    </aside>
  );
}
