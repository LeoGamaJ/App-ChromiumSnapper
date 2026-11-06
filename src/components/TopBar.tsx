import { Camera, FileArchive, Home, Keyboard, Play, Square } from 'lucide-react';
import { cn, Spinner } from './ui';

interface TopBarProps {
  urlCount: number;
  canCapture: boolean;
  itemCount: number;
  isRunning: boolean;
  isZipping: boolean;
  onCapture: () => void;
  onStop: () => void;
  onZip: () => void;
  onShowShortcuts: () => void;
  onNavigateHome?: () => void;
}

export function TopBar({
  urlCount,
  canCapture,
  itemCount,
  isRunning,
  isZipping,
  onCapture,
  onStop,
  onZip,
  onShowShortcuts,
  onNavigateHome,
}: TopBarProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-[#060910]/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1440px] items-center gap-3 px-5 lg:px-8">
        {/* Brand */}
        <button
          type="button"
          onClick={onNavigateHome}
          className="flex min-w-0 items-center gap-3 text-left transition-opacity hover:opacity-90 focus:outline-none"
          title="Voltar para a página inicial"
        >
          <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] bg-gradient-to-br from-amber-300 via-amber-500 to-orange-600 shadow-[0_8px_24px_-8px_rgba(245,166,35,0.85)] ring-1 ring-white/25">
            <Camera className="h-[18px] w-[18px] text-[#1b1305]" strokeWidth={2.4} />
          </div>
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-[15px] font-extrabold leading-none tracking-[-0.02em] text-white">
              Chromium Snapper
            </span>
          </div>
        </button>

        {/* Actions */}
        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
          {onNavigateHome && (
            <button
              type="button"
              onClick={onNavigateHome}
              className="btn btn-ghost btn-sm text-slate-400 hover:text-white"
              title="Voltar para a Landing Page"
            >
              <Home className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Início</span>
            </button>
          )}

          <button
            type="button"
            onClick={onShowShortcuts}
            className="btn btn-ghost btn-sm hidden text-slate-400 md:inline-flex"
          >
            <Keyboard className="h-3.5 w-3.5" />
            <span>Atalhos</span>
          </button>

          {itemCount > 0 && (
            <button
              type="button"
              onClick={onZip}
              disabled={isZipping || isRunning}
              className="btn btn-secondary btn-sm hidden sm:inline-flex"
              title="Baixar todas as capturas em ZIP"
            >
              {isZipping ? (
                <Spinner className="h-3.5 w-3.5 text-amber-400" />
              ) : (
                <FileArchive className="h-3.5 w-3.5 text-amber-400" />
              )}
              <span className="hidden sm:inline">ZIP</span>
              <span className="font-mono text-[10.5px] text-slate-400">{itemCount}</span>
            </button>
          )}

          <button
            type="button"
            onClick={isRunning ? onStop : onCapture}
            disabled={!isRunning && !canCapture}
            className={cn(
              'btn',
              isRunning
                ? 'border-rose-400/40 bg-rose-600 text-white hover:bg-rose-500'
                : 'btn-primary'
            )}
          >
            {isRunning ? (
              <>
                <Square className="h-3.5 w-3.5 fill-current" />
                <span className="hidden sm:inline">Interromper</span>
                <span className="sm:hidden">Stop</span>
              </>
            ) : (
              <>
                <Play className="h-3.5 w-3.5 fill-current" />
                <span className="hidden sm:inline">Capturar lote</span>
                <span className="sm:hidden">Capturar</span>
                <span className="rounded-md bg-black/15 px-1.5 py-0.5 font-mono text-[10.5px] font-bold">
                  {urlCount}
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
