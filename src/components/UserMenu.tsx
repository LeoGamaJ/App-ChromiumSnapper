import { useEffect, useRef, useState } from 'react';
import {
  CheckCircle2,
  ChevronDown,
  KeyRound,
  Settings2,
  Sparkles,
  UserRound,
} from 'lucide-react';
import { cn } from './ui';

interface UserMenuProps {
  aiConfigured: boolean;
  aiModel: string;
  reportCount: number;
  onOpenAiSettings: () => void;
  onOpenReports: () => void;
}

export function UserMenu({
  aiConfigured,
  aiModel,
  reportCount,
  onOpenAiSettings,
  onOpenReports,
}: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const openSettings = () => {
    setOpen(false);
    onOpenAiSettings();
  };
  const openReports = () => {
    setOpen(false);
    onOpenReports();
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((previous) => !previous)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Menu do usuário e configuração de IA"
        title="Usuário e API de IA"
        className={cn(
          'btn btn-ghost btn-sm h-8 gap-1.5 px-1.5 text-slate-300 sm:pr-2',
          open && 'bg-white/[0.06] text-white'
        )}
      >
        <span className="relative flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-slate-600 to-slate-800 ring-1 ring-white/15">
          <UserRound className="h-3.5 w-3.5 text-slate-100" />
          <span
            aria-hidden="true"
            className={cn(
              'absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border-2 border-[#060910]',
              aiConfigured ? 'bg-emerald-400' : 'bg-amber-400'
            )}
          />
        </span>
        <span className="hidden text-[13px] font-semibold md:inline">Usuário</span>
        <ChevronDown
          className={cn(
            'hidden h-3 w-3 text-slate-500 transition-transform md:block',
            open && 'rotate-180'
          )}
        />
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Menu do usuário"
          className="scroll-area anim-in fixed left-2 right-2 top-[58px] z-[60] max-h-[calc(100dvh-70px)] w-auto overflow-y-auto rounded-xl border border-white/[0.1] bg-[#0b1019]/98 shadow-2xl shadow-black/70 backdrop-blur-xl sm:absolute sm:left-auto sm:right-0 sm:top-[calc(100%+8px)] sm:w-[288px]"
        >
          <div className="border-b border-white/[0.07] px-3.5 py-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-amber-300 via-amber-500 to-orange-600 text-[13px] font-extrabold text-[#1b1305] ring-1 ring-white/20">
                U
              </span>
              <div className="min-w-0">
                <p className="text-[13.5px] font-bold text-white">Sessão local</p>
                <p className="truncate font-mono text-[10.5px] text-slate-400">
                  workspace · chromium-snapper
                </p>
              </div>
            </div>
            <div className="mt-2.5 flex items-start gap-1.5 rounded-lg border border-white/[0.06] bg-black/30 px-2 py-1.5">
              <CheckCircle2
                className={cn(
                  'mt-0.5 h-3 w-3 shrink-0',
                  aiConfigured ? 'text-emerald-400' : 'text-amber-400'
                )}
              />
              <div className="min-w-0">
                <p className="text-[11.5px] font-semibold text-slate-200">
                  {aiConfigured ? 'API de IA configurada' : 'API de IA não configurada'}
                </p>
                <p className="truncate font-mono text-[10.5px] text-slate-400" title={aiModel}>
                  DeepSeek · {aiModel || 'modelo padrão'}
                </p>
              </div>
            </div>
          </div>

          <div className="p-1.5">
            <button
              type="button"
              role="menuitem"
              onClick={openSettings}
              className="flex w-full items-start gap-2.5 rounded-lg px-2 py-2 text-left transition-colors hover:bg-white/[0.05] focus-visible:bg-white/[0.06]"
            >
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-amber-400/20 bg-amber-400/[0.08] text-amber-300">
                <Settings2 className="h-3.5 w-3.5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-semibold text-slate-100">
                  Configurar API de IA
                </span>
                <span className="mt-0.5 block text-[11px] leading-snug text-slate-400">
                  Chave DeepSeek, modelo e profundidade de análise.
                </span>
              </span>
              <KeyRound className="mt-1.5 h-3 w-3 shrink-0 text-slate-500" />
            </button>

            <button
              type="button"
              role="menuitem"
              onClick={openReports}
              className="flex w-full items-start gap-2.5 rounded-lg px-2 py-2 text-left transition-colors hover:bg-white/[0.05] focus-visible:bg-white/[0.06]"
            >
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-sky-400/20 bg-sky-400/[0.08] text-sky-300">
                <Sparkles className="h-3.5 w-3.5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-semibold text-slate-100">
                  Relatórios Dev
                </span>
                <span className="mt-0.5 block text-[11px] leading-snug text-slate-400">
                  Histórico local de engenharia reversa.
                </span>
              </span>
              <span className="mt-1 shrink-0 rounded-full border border-white/[0.1] bg-white/[0.04] px-1.5 py-0.5 font-mono text-[10.5px] font-bold text-slate-300">
                {reportCount}
              </span>
            </button>
          </div>

          <div className="border-t border-white/[0.07] px-3.5 py-2">
            <p className="text-[10.5px] leading-relaxed text-slate-500">
              A chave fica apenas neste navegador. As capturas continuam locais; a IA recebe
              apenas os dados extraídos quando você gera um relatório.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
