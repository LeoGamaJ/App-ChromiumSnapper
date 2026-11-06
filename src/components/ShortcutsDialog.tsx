import { useEffect, useRef } from 'react';
import { Command, Keyboard, X } from 'lucide-react';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { Kbd } from './ui';

const SHORTCUTS: Array<{ keys: string[]; action: string }> = [
  { keys: ['Ctrl / Cmd', 'Enter'], action: 'Iniciar a captura do lote' },
  { keys: ['F'], action: 'Alternar modo foco (ocultar painéis)' },
  { keys: ['Esc'], action: 'Fechar a prévia ou este painel' },
  { keys: ['←', '→'], action: 'Navegar entre capturas na prévia' },
  { keys: ['+', '−'], action: 'Aplicar zoom na prévia' },
  { keys: ['0'], action: 'Ajustar a imagem à tela' },
];

export function ShortcutsDialog({ onClose }: { onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useFocusTrap(dialogRef);

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus?.();
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-[#03050a]/80 p-4 backdrop-blur-md"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="shortcuts-title"
        className="anim-in panel w-full max-w-md overflow-hidden"
      >
        <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
          <div className="flex items-center gap-2.5">
            <span className="icon-tile icon-tile-accent">
              <Keyboard className="h-4 w-4" />
            </span>
            <div>
              <h2 id="shortcuts-title" className="text-[15px] font-bold text-white">
                Atalhos de teclado
              </h2>
              <p className="text-[12px] text-slate-500">Navegue sem tirar as mãos do teclado.</p>
            </div>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Fechar atalhos"
            className="btn btn-ghost btn-icon text-slate-500 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 py-2">
          {SHORTCUTS.map((shortcut) => (
            <div
              key={shortcut.action}
              className="flex items-center justify-between gap-4 border-b border-white/[0.04] py-2.5 last:border-b-0"
            >
              <span className="text-[13px] text-slate-300">{shortcut.action}</span>
              <span className="flex shrink-0 items-center gap-1">
                {shortcut.keys.map((key) => (
                  <Kbd key={key}>{key}</Kbd>
                ))}
              </span>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-1.5 border-t border-white/[0.06] bg-black/20 px-5 py-3 text-[11.5px] text-slate-600">
          <Command className="h-3 w-3" />
          No macOS, use <Kbd>Cmd</Kbd> + <Kbd>Enter</Kbd>; no Windows e Linux, <Kbd>Ctrl</Kbd> + <Kbd>Enter</Kbd>.
        </div>
      </div>
    </div>
  );
}
