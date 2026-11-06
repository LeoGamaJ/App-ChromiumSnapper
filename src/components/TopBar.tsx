import {
  Camera,
  ChevronRight,
  Focus,
  Keyboard,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Play,
  SlidersHorizontal,
  Square,
} from 'lucide-react';
import { cn, Spinner } from './ui';

interface TopBarProps {
  urlCount: number;
  canCapture: boolean;
  isRunning: boolean;
  isFocusMode: boolean;
  isConfigCollapsed: boolean;
  isInspectorCollapsed: boolean;
  onToggleConfigCollapsed: () => void;
  onToggleInspectorCollapsed: () => void;
  onCapture: () => void;
  onStop: () => void;
  onShowShortcuts: () => void;
  onToggleFocus: () => void;
  onToggleConfig: () => void;
  onNavigateHome: () => void;
}

export function TopBar({
  urlCount,
  canCapture,
  isRunning,
  isFocusMode,
  isConfigCollapsed,
  isInspectorCollapsed,
  onToggleConfigCollapsed,
  onToggleInspectorCollapsed,
  onCapture,
  onStop,
  onShowShortcuts,
  onToggleFocus,
  onToggleConfig,
  onNavigateHome,
}: TopBarProps) {
  return (
    <header className="relative z-40 flex h-[54px] shrink-0 items-center gap-2 border-b border-white/[0.07] bg-[#060910]/95 px-3 lg:gap-3 lg:px-4">
      {/* Mobile: open configuration drawer */}
      <button
        type="button"
        onClick={onToggleConfig}
        className="btn btn-ghost btn-icon text-slate-400 hover:text-white lg:hidden"
        aria-label="Abrir configuração do lote"
        title="Configuração do lote"
      >
        <SlidersHorizontal className="h-4 w-4" />
      </button>

      {/* Brand */}
      <div className="flex min-w-0 items-center gap-2.5">
        <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] bg-gradient-to-br from-amber-300 via-amber-500 to-orange-600 shadow-[0_6px_18px_-6px_rgba(245,166,35,0.9)] ring-1 ring-white/25">
          <Camera className="h-4 w-4 text-[#1b1305]" strokeWidth={2.4} />
        </div>
        <span className="truncate text-[15.5px] font-extrabold tracking-[-0.02em] text-white">
          Chromium Snapper
        </span>
      </div>

      {/* Breadcrumb / mode */}
      <div className="ml-1 hidden items-center gap-1.5 border-l border-white/[0.08] pl-3 md:flex">
        <span className="text-[12.5px] font-medium text-slate-500">Workspace</span>
        <ChevronRight className="h-3 w-3 text-slate-700" />
        <span className="text-[12.5px] font-semibold text-slate-300">
          {isFocusMode ? 'Modo foco' : 'Captura em lote'}
        </span>
        <span
          className={cn(
            'ml-1 flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-mono text-[11px]',
            isRunning
              ? 'border-amber-400/25 bg-amber-400/[0.08] text-amber-300'
              : 'border-white/[0.08] bg-white/[0.03] text-slate-500'
          )}
        >
          <span
            className={cn(
              'h-1.5 w-1.5 rounded-full',
              isRunning ? 'animate-pulse bg-amber-400' : 'bg-emerald-400/80'
            )}
          />
          {isRunning ? 'executando' : 'local'}
        </span>
      </div>

      {/* Actions */}
      <div className="ml-auto flex items-center gap-1.5">
        {!isFocusMode && (
          <div className="hidden items-center gap-0.5 rounded-lg border border-white/[0.06] bg-white/[0.03] p-0.5 lg:flex">
            <button
              type="button"
              onClick={onToggleConfigCollapsed}
              aria-pressed={!isConfigCollapsed}
              className="btn btn-ghost btn-icon h-7 w-7 text-slate-400 hover:text-white"
              title={isConfigCollapsed ? 'Expandir configuração' : 'Retrair configuração'}
              aria-label={isConfigCollapsed ? 'Expandir configuração' : 'Retrair configuração'}
            >
              {isConfigCollapsed ? (
                <PanelLeftOpen className="h-[18px] w-[18px]" />
              ) : (
                <PanelLeftClose className="h-[18px] w-[18px]" />
              )}
            </button>
            <button
              type="button"
              onClick={onToggleInspectorCollapsed}
              aria-pressed={!isInspectorCollapsed}
              className="btn btn-ghost btn-icon hidden h-7 w-7 text-slate-500 hover:text-white 2xl:inline-flex"
              title={isInspectorCollapsed ? 'Expandir inspetor' : 'Retrair inspetor'}
              aria-label={isInspectorCollapsed ? 'Expandir inspetor' : 'Retrair inspetor'}
            >
              {isInspectorCollapsed ? (
                <PanelRightOpen className="h-[18px] w-[18px]" />
              ) : (
                <PanelRightClose className="h-[18px] w-[18px]" />
              )}
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={onShowShortcuts}
          className="btn btn-ghost btn-sm hidden text-slate-400 hover:text-white md:inline-flex"
          title="Atalhos de teclado"
        >
          <Keyboard className="h-3.5 w-3.5" />
          <span className="hidden xl:inline">Atalhos</span>
        </button>

        <button
          type="button"
          onClick={onToggleFocus}
          aria-pressed={isFocusMode}
          className={cn(
            'btn btn-sm hidden lg:inline-flex',
            isFocusMode
              ? 'border-amber-400/30 bg-amber-400/[0.1] text-amber-200'
              : 'btn-ghost text-slate-400 hover:text-white'
          )}
          title={isFocusMode ? 'Sair do modo foco' : 'Modo foco — ocultar painéis'}
        >
          <Focus className="h-3.5 w-3.5" />
          <span className="hidden xl:inline">Foco</span>
        </button>

        <span className="mx-0.5 hidden h-5 w-px bg-white/[0.08] lg:block" aria-hidden="true" />

        <button
          type="button"
          onClick={onNavigateHome}
          disabled={isRunning}
          className="btn btn-ghost btn-sm text-slate-500 hover:text-slate-200"
          title={isRunning ? 'Interrompa a captura para sair' : 'Sair do workspace'}
          aria-label="Sair do workspace"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span className="hidden lg:inline">Sair</span>
        </button>

        <button
          type="button"
          onClick={isRunning ? onStop : onCapture}
          disabled={!isRunning && !canCapture}
          className={cn(
            'btn ml-0.5',
            isRunning
              ? 'border-rose-400/40 bg-rose-600 text-white hover:bg-rose-500'
              : 'btn-primary',
            !isFocusMode && !isConfigCollapsed && 'lg:hidden'
          )}
          title={isRunning ? 'Interromper captura' : 'Capturar lote (Ctrl + Enter)'}
        >
          {isRunning ? (
            <>
              <Spinner className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Interromper</span>
            </>
          ) : (
            <>
              <Play className="h-3.5 w-3.5 fill-current" />
              <span className="hidden sm:inline">Capturar</span>
              <span className="rounded-md bg-black/15 px-1.5 py-0.5 font-mono text-[11.5px] font-bold">
                {urlCount}
              </span>
            </>
          )}
        </button>
      </div>
    </header>
  );
}
