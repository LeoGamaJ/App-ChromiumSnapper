import { useEffect, useMemo, useRef, useState } from 'react';
import {
  BookOpen,
  Clock,
  Download,
  FileText,
  Search,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import {
  buildDevReportFileName,
  formatReportAsText,
  reportHost,
  type DevReportRecord,
} from '../lib/devReport';
import { useFocusTrap } from '../hooks/useFocusTrap';

interface ReportsDialogProps {
  reports: DevReportRecord[];
  onOpen: (report: DevReportRecord) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

function downloadText(report: DevReportRecord) {
  const blob = new Blob([`\ufeff${formatReportAsText(report)}`], {
    type: 'text/plain;charset=utf-8',
  });
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = buildDevReportFileName(report, 'txt');
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1500);
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function ReportsDialog({ reports, onOpen, onDelete, onClose }: ReportsDialogProps) {
  const [query, setQuery] = useState('');
  const dialogRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  useFocusTrap(dialogRef);

  useEffect(() => {
    searchRef.current?.focus();
  }, []);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return reports;
    return reports.filter(
      (report) =>
        report.url.toLowerCase().includes(needle) ||
        (report.title || '').toLowerCase().includes(needle) ||
        report.markdown.toLowerCase().includes(needle)
    );
  }, [query, reports]);

  return (
    <div
      className="fixed inset-0 z-[68] flex items-center justify-center bg-[#03050a]/85 p-2 backdrop-blur-md sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="reports-title"
        className="anim-in panel flex max-h-[min(92dvh,820px)] w-full max-w-2xl flex-col overflow-hidden"
      >
        <div className="flex shrink-0 items-start gap-3 border-b border-white/[0.07] px-4 py-3.5 sm:px-5">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400/90 via-indigo-500 to-violet-600 text-white shadow-[0_8px_24px_-10px_rgba(99,102,241,0.8)] ring-1 ring-white/20">
            <Sparkles className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="reports-title" className="text-[15.5px] font-bold text-white">
              Relatórios Dev
            </h2>
            <p className="mt-0.5 text-[12px] text-slate-400">
              Histórico local de engenharia reversa. Abra, baixe ou remova relatórios gerados.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar relatórios Dev"
            className="btn btn-ghost btn-icon h-8 w-8 text-slate-400 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="shrink-0 border-b border-white/[0.05] px-4 py-2.5 sm:px-5">
          <div className="field flex items-center gap-2 px-3 py-1.5">
            <Search className="h-3.5 w-3.5 shrink-0 text-slate-500" />
            <input
              ref={searchRef}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar por domínio, título ou conteúdo..."
              aria-label="Buscar relatórios"
              className="min-w-0 flex-1 bg-transparent py-1 text-[13px] text-slate-200 outline-none placeholder:text-slate-500"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="text-[11px] font-semibold text-slate-500 hover:text-slate-300"
              >
                limpar
              </button>
            )}
          </div>
        </div>

        <div className="scroll-area min-h-0 flex-1 overflow-y-auto p-2.5 sm:p-3">
          {reports.length === 0 ? (
            <div className="flex h-full min-h-[240px] flex-col items-center justify-center px-6 text-center">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03] text-slate-400">
                <Sparkles className="h-5 w-5" />
              </span>
              <p className="mt-3 text-[14.5px] font-semibold text-slate-200">
                Nenhum relatório ainda
              </p>
              <p className="mt-1 max-w-sm text-[12px] leading-relaxed text-slate-400">
                Capture uma página, abra a ação "Relatório Dev" no artboard e a IA monta a
                engenharia reversa completa. Os últimos relatórios ficam aqui.
              </p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex min-h-[180px] flex-col items-center justify-center px-6 text-center">
              <Search className="h-5 w-5 text-slate-500" />
              <p className="mt-2 text-[13px] font-semibold text-slate-300">
                Nenhum relatório corresponde a “{query}”
              </p>
              <button
                type="button"
                onClick={() => setQuery('')}
                className="mt-2 text-[11.5px] font-semibold text-amber-300 hover:text-amber-200"
              >
                Limpar busca
              </button>
            </div>
          ) : (
            <ul className="space-y-1.5">
              {filtered.map((report) => (
                <li
                  key={report.id}
                  className="group flex items-start gap-3 rounded-xl border border-white/[0.06] bg-white/[0.015] px-3 py-2.5 transition-colors hover:border-white/[0.13] hover:bg-white/[0.03]"
                >
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-indigo-400/20 bg-indigo-400/[0.07] text-indigo-300">
                    <BookOpen className="h-3.5 w-3.5" />
                  </span>
                  <button
                    type="button"
                    onClick={() => onOpen(report)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <span className="block truncate text-[13.5px] font-semibold text-slate-100">
                      {report.title || reportHost(report.url)}
                    </span>
                    <span className="mt-0.5 block truncate font-mono text-[10.5px] text-slate-400">
                      {report.url}
                    </span>
                    <span className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[10.5px] text-slate-500">
                      <span className="flex items-center gap-1">
                        <Clock className="h-2.5 w-2.5" />
                        {formatDate(report.createdAt)}
                      </span>
                      <span className="rounded border border-white/[0.08] bg-black/25 px-1.5 py-0.5 font-mono text-[9.5px] text-slate-400">
                        {report.model}
                      </span>
                      {report.technical && (
                        <span>
                          {report.technical.sections} seções · {report.technical.images} imagens
                        </span>
                      )}
                      <span>{Math.max(1, Math.round(report.markdown.length / 1000))}k chars</span>
                    </span>
                  </button>
                  <div className="flex shrink-0 items-center gap-0.5 pt-0.5">
                    <button
                      type="button"
                      onClick={() => downloadText(report)}
                      title="Baixar TXT"
                      aria-label={`Baixar TXT de ${reportHost(report.url)}`}
                      className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-white/[0.06] hover:text-amber-300"
                    >
                      <Download className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(report.id)}
                      title="Excluir relatório"
                      aria-label={`Excluir relatório de ${reportHost(report.url)}`}
                      className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-rose-400/10 hover:text-rose-300"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-white/[0.07] bg-[#080b12]/90 px-4 py-2.5 sm:px-5">
          <p className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <FileText className="h-3 w-3" />
            {reports.length} {reports.length === 1 ? 'relatório salvo' : 'relatórios salvos'} neste
            navegador
          </p>
          <button type="button" onClick={onClose} className="btn btn-secondary btn-sm">
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
