import { useEffect, useRef } from 'react';
import { AlertTriangle, Download, LogOut, X } from 'lucide-react';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { Spinner } from './ui';

interface LeaveDialogProps {
  captureCount: number;
  isZipping: boolean;
  onCancel: () => void;
  onDownloadAndLeave: () => void;
  onLeaveWithoutDownload: () => void;
}

export function LeaveDialog({
  captureCount,
  isZipping,
  onCancel,
  onDownloadAndLeave,
  onLeaveWithoutDownload,
}: LeaveDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useFocusTrap(dialogRef);

  useEffect(() => {
    cancelRef.current?.focus();
  }, []);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isZipping) {
        event.preventDefault();
        onCancel();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isZipping, onCancel]);

  return (
    <div
      className="fixed inset-0 z-[65] flex items-center justify-center bg-[#03050a]/80 p-4 backdrop-blur-md"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isZipping) onCancel();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="leave-title"
        aria-describedby="leave-description"
        className="anim-in panel w-full max-w-md overflow-hidden"
      >
        <div className="flex items-start justify-between gap-3 border-b border-white/[0.06] px-5 py-4">
          <div className="flex items-start gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-amber-400/25 bg-amber-400/[0.08] text-amber-300">
              <AlertTriangle className="h-4 w-4" />
            </span>
            <div>
              <h2 id="leave-title" className="text-[15px] font-bold text-white">
                Sair do workspace?
              </h2>
              <p id="leave-description" className="mt-1 text-[12.5px] leading-relaxed text-slate-400">
                {captureCount} {captureCount === 1 ? 'captura está' : 'capturas estão'} apenas na
                memória deste navegador. Se recarregar ou fechar a aba sem baixar, elas serão
                perdidas.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={isZipping}
            aria-label="Continuar no workspace"
            className="btn btn-ghost btn-icon h-8 w-8 shrink-0 text-slate-400 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-1.5 px-5 py-4">
          <button
            type="button"
            onClick={onDownloadAndLeave}
            disabled={isZipping}
            className="btn btn-primary w-full py-2.5"
          >
            {isZipping ? <Spinner className="h-4 w-4" /> : <Download className="h-4 w-4" />}
            {isZipping ? 'Gerando ZIP...' : 'Baixar ZIP e sair'}
          </button>
          <button
            type="button"
            onClick={onLeaveWithoutDownload}
            disabled={isZipping}
            className="btn btn-ghost btn-sm w-full text-slate-400 hover:text-rose-300"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sair sem baixar
          </button>
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            disabled={isZipping}
            className="btn btn-secondary btn-sm w-full"
          >
            Continuar no workspace
          </button>
        </div>
      </div>
    </div>
  );
}
