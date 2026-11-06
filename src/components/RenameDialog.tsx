import { useEffect, useMemo, useRef, useState } from 'react';
import { FileText, X } from 'lucide-react';
import {
  ensureFileNameExtension,
  sanitizeFileName,
  type CapturedItem,
} from '../lib/snapper';
import { useFocusTrap } from '../hooks/useFocusTrap';

interface RenameDialogProps {
  item: CapturedItem;
  onClose: () => void;
  onSave: (fileName: string) => void;
}

export function RenameDialog({ item, onClose, onSave }: RenameDialogProps) {
  const [draft, setDraft] = useState(item.fileName);
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useFocusTrap(dialogRef);

  const finalName = useMemo(
    () => ensureFileNameExtension(sanitizeFileName(draft, 'captura'), item.format),
    [draft, item.format]
  );

  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    input.focus();
    const dot = item.fileName.lastIndexOf('.');
    input.setSelectionRange(0, dot > 0 ? dot : item.fileName.length);
  }, [item.fileName]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[65] flex items-center justify-center bg-[#03050a]/80 p-4 backdrop-blur-md"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="rename-title"
        className="anim-in panel w-full max-w-md overflow-hidden"
      >
        <div className="flex items-start justify-between gap-3 border-b border-white/[0.06] px-5 py-4">
          <div className="min-w-0">
            <h2 id="rename-title" className="text-[15px] font-bold text-white">
              Renomear arquivo
            </h2>
            <p className="mt-0.5 truncate font-mono text-[11.5px] text-slate-400" title={item.url}>
              {item.url}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar renomear"
            className="btn btn-ghost btn-icon h-8 w-8 text-slate-400 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            onSave(finalName);
            onClose();
          }}
          className="px-5 py-4"
        >
          <label htmlFor="rename-file-name" className="label">
            Nome do arquivo
          </label>
          <input
            ref={inputRef}
            id="rename-file-name"
            type="text"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            spellCheck={false}
            autoComplete="off"
            className="field mt-2 w-full px-3 py-2 font-mono text-[13.5px] text-amber-200/90 placeholder:text-slate-400"
            placeholder="nome-do-arquivo"
          />

          <div className="mt-3 flex items-start gap-2 rounded-lg border border-white/[0.06] bg-black/25 px-2.5 py-2">
            <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400/80" />
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                Nome final
              </p>
              <p className="mt-0.5 truncate font-mono text-[12px] text-slate-300" title={finalName}>
                {finalName}
              </p>
            </div>
          </div>

          <p className="mt-2 text-[11.5px] leading-relaxed text-slate-400">
            A extensão é definida pelo formato da captura. Nomes repetidos recebem sufixo
            automaticamente no ZIP.
          </p>

          <div className="mt-4 flex items-center justify-end gap-2">
            <button type="button" onClick={onClose} className="btn btn-secondary btn-sm">
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary btn-sm">
              Salvar nome
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
