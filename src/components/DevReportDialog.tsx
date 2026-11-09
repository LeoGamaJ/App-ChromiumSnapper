import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowDown,
  BookOpen,
  Check,
  Clipboard,
  Copy,
  Download,
  FileCode2,
  FileText,
  Image as ImageIcon,
  ListTree,
  Maximize2,
  RefreshCw,
  Settings2,
  Sparkles,
  X,
} from 'lucide-react';
import {
  buildDevReportFileName,
  buildTechnicalAppendix,
  extractMarkdownHeadings,
  formatReportAsText,
  renderMarkdownToHtml,
  reportHost,
  type AiSettings,
  type DevReportMetaEvent,
  type DevReportRecord,
  type DevReportStageEvent,
  type DevReportUsage,
} from '../lib/devReport';
import {
  formatClock,
  type CaptureSettings,
  type CapturedItem,
} from '../lib/snapper';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { cn, Spinner } from './ui';

interface DevReportDialogProps {
  item?: CapturedItem | null;
  url: string;
  existing?: DevReportRecord | null;
  aiSettings: AiSettings;
  captureSettings: CaptureSettings;
  onClose: () => void;
  onSaved: (record: DevReportRecord) => void;
  onOpenAiSettings: () => void;
  onNotify: (message: string, kind?: 'success' | 'error' | 'info') => void;
}

interface DonePayload {
  usage?: DevReportUsage;
  durationMs?: number;
  finishReason?: string;
  model?: string;
  reasoningChars?: number;
  contentChars?: number;
}

function downloadBlob(blob: Blob, fileName: string) {
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1500);
}

function formatTokenCount(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return '—';
  return value >= 1000 ? `${(value / 1000).toFixed(1)}k` : String(value);
}

export function DevReportDialog({
  item,
  url,
  existing = null,
  aiSettings,
  captureSettings,
  onClose,
  onSaved,
  onOpenAiSettings,
  onNotify,
}: DevReportDialogProps) {
  const [markdown, setMarkdown] = useState(existing?.markdown ?? '');
  const [meta, setMeta] = useState<DevReportMetaEvent | null>(null);
  const [completed, setCompleted] = useState<DevReportRecord | null>(existing);
  const [stage, setStage] = useState<DevReportStageEvent | null>(
    existing
      ? { stage: 'done', message: 'Relatório carregado do histórico.' }
      : { stage: 'connecting', message: 'Iniciando a análise da página...' }
  );
  const [isStreaming, setIsStreaming] = useState(!existing);
  const [reasoningChars, setReasoningChars] = useState(0);
  const [done, setDone] = useState<DonePayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<'report' | 'data'>('report');
  const [includeTechnical, setIncludeTechnical] = useState(false);
  const [follow, setFollow] = useState(true);
  const [copied, setCopied] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [incomplete, setIncomplete] = useState(false);

  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);
  const savedRef = useRef(false);
  const metaRef = useRef<DevReportMetaEvent | null>(null);
  const doneRef = useRef<DonePayload | null>(null);
  const recordIdRef = useRef(`report_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`);
  const createdAtRef = useRef(new Date().toISOString());

  useFocusTrap(dialogRef);

  const startGeneration = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    savedRef.current = false;
    metaRef.current = null;
    doneRef.current = null;

    setMarkdown('');
    setMeta(null);
    setCompleted(null);
    setDone(null);
    setError(null);
    setIncomplete(false);
    setReasoningChars(0);
    setIsStreaming(true);
    setTab('report');
    setStage({ stage: 'connecting', message: 'Iniciando a análise da página...' });
    createdAtRef.current = new Date().toISOString();

    let content = '';
    let pendingContent = '';
    let flushTimer: number | null = null;
    let streamError: string | null = null;
    let completedOk = false;

    // Atualizar o Markdown a cada token custa caro em relatórios longos.
    // Agrupamos os deltas e re-renderizamos a cada ~90 ms.
    const flushContent = () => {
      flushTimer = null;
      if (!mountedRef.current || abortRef.current !== controller) return;
      if (!pendingContent) return;
      const chunk = pendingContent;
      pendingContent = '';
      setMarkdown((previous) => previous + chunk);
    };
    const scheduleFlush = () => {
      if (flushTimer !== null) return;
      flushTimer = window.setTimeout(flushContent, 90);
    };

    const handleEvent = (block: string) => {
      const lines = block.split('\n');
      let eventName = 'message';
      const dataLines: string[] = [];
      for (const line of lines) {
        if (line.startsWith('event:')) eventName = line.slice(6).trim();
        else if (line.startsWith('data:')) dataLines.push(line.slice(5).trimStart());
      }
      if (dataLines.length === 0) return;
      let payload: any;
      try {
        payload = JSON.parse(dataLines.join('\n'));
      } catch {
        return;
      }

      if (eventName === 'stage') {
        setStage({
          stage: payload.stage,
          message: payload.message || 'Processando...',
        });
      } else if (eventName === 'meta') {
        metaRef.current = payload as DevReportMetaEvent;
        setMeta(payload as DevReportMetaEvent);
        setTab('report');
      } else if (eventName === 'reasoning') {
        if (typeof payload.text === 'string') {
          setReasoningChars((previous) => previous + payload.text.length);
        }
      } else if (eventName === 'delta') {
        if (typeof payload.text === 'string' && payload.text) {
          content += payload.text;
          pendingContent += payload.text;
          scheduleFlush();
        }
      } else if (eventName === 'done') {
        doneRef.current = payload as DonePayload;
        setDone(payload as DonePayload);
        completedOk = true;
      } else if (eventName === 'error') {
        streamError = payload.error || 'Falha ao gerar o relatório.';
        setError(streamError);
      }
    };

    try {
      const response = await fetch('/api/dev-report/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          url,
          capture: {
            width: captureSettings.width,
            height: captureSettings.height,
            heroWaitMs: captureSettings.heroWaitMs,
            delayMs: captureSettings.delayMs,
            colorScheme: captureSettings.colorScheme,
            autoScroll: captureSettings.autoScroll,
            hideCookieBanners: captureSettings.hideCookieBanners,
            customHeaders: captureSettings.customHeaders,
            customCookies: captureSettings.customCookies,
          },
          ai: {
            apiKey: aiSettings.apiKey,
            baseUrl: aiSettings.baseUrl,
            model: aiSettings.model,
            depth: aiSettings.depth,
            includeImage: aiSettings.includeImage,
            useServerKey: aiSettings.useServerKey,
          },
        }),
      });

      if (!response.ok) {
        let detail = `Falha no servidor (${response.status}).`;
        try {
          const payload = await response.json();
          if (payload?.error) detail = payload.error;
        } catch {
          // Mantém a mensagem baseada no status.
        }
        throw new Error(detail);
      }
      if (!response.body) throw new Error('Streaming não é suportado por este navegador.');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done: finished, value } = await reader.read();
        if (finished) break;
        buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n');
        let separator = buffer.indexOf('\n\n');
        while (separator !== -1) {
          const block = buffer.slice(0, separator);
          buffer = buffer.slice(separator + 2);
          if (block.trim()) handleEvent(block);
          separator = buffer.indexOf('\n\n');
        }
      }
      if (buffer.trim()) handleEvent(buffer);
    } catch (caught) {
      if ((caught as Error).name === 'AbortError') return;
      streamError = (caught as Error).message || 'Não foi possível gerar o relatório.';
      if (mountedRef.current) {
        setError(streamError);
        setStage({ stage: 'done', message: 'A geração falhou.' });
      }
    }

    if (!mountedRef.current || abortRef.current !== controller) return;
    if (flushTimer !== null) {
      window.clearTimeout(flushTimer);
      flushTimer = null;
    }
    pendingContent = '';
    setMarkdown(content);
    setIsStreaming(false);

    if (streamError || !content.trim()) {
      if (!streamError) {
        setError('A IA não retornou conteúdo. Tente novamente.');
      }
      return;
    }

    if (!completedOk) setIncomplete(true);

    const readMeta = (): DevReportMetaEvent | null => metaRef.current;
    const readDone = (): DonePayload | null => doneRef.current;
    const metaData = readMeta();
    const doneData = readDone();
    const record: DevReportRecord = {
      id: recordIdRef.current,
      url,
      title: metaData?.title || reportHost(url),
      model: metaData?.model || aiSettings.model,
      markdown: content,
      createdAt: createdAtRef.current,
      durationMs: doneData?.durationMs,
      usage: doneData?.usage,
      technical: metaData
        ? {
            title: metaData.title,
            palette: metaData.palette || [],
            fonts: metaData.fonts || [],
            sections: metaData.sections || 0,
            nodes: metaData.nodes || 0,
            images: metaData.images || 0,
            stylesheets: metaData.stylesheets || 0,
            scripts: metaData.scripts || 0,
            breakpoints: metaData.breakpoints || [],
            imageAttached: Boolean(metaData.imageAttached),
            finalUrl: metaData.finalUrl,
            statusCode: metaData.statusCode,
          }
        : undefined,
    };

    setCompleted(record);
    setStage({ stage: 'done', message: 'Relatório concluído.' });
    // Depois do streaming, volta ao início para a leitura começar pelo
    // sumário executivo em vez de terminar no rodapé.
    setFollow(true);
    window.requestAnimationFrame(() => {
      if (contentRef.current) contentRef.current.scrollTop = 0;
    });
    if (!savedRef.current) {
      savedRef.current = true;
      onSaved(record);
    }
  }, [aiSettings, captureSettings, onSaved, url]);

  useEffect(() => {
    mountedRef.current = true;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    if (!existing) void startGeneration();
    return () => {
      mountedRef.current = false;
      document.body.style.overflow = previousOverflow;
      abortRef.current?.abort();
    };
    // A geração é disparada uma única vez por instância do diálogo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        abortRef.current?.abort();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!follow || !isStreaming) return;
    const container = contentRef.current;
    if (!container) return;
    container.scrollTop = container.scrollHeight;
  }, [follow, isStreaming, markdown]);

  const headings = useMemo(() => extractMarkdownHeadings(markdown), [markdown]);
  const reportHtml = useMemo(() => renderMarkdownToHtml(markdown), [markdown]);
  const effectiveTechnical = completed?.technical ?? (meta
    ? {
        title: meta.title,
        palette: meta.palette || [],
        fonts: meta.fonts || [],
        sections: meta.sections || 0,
        nodes: meta.nodes || 0,
        images: meta.images || 0,
        stylesheets: meta.stylesheets || 0,
        scripts: meta.scripts || 0,
        breakpoints: meta.breakpoints || [],
        imageAttached: Boolean(meta.imageAttached),
        finalUrl: meta.finalUrl,
        statusCode: meta.statusCode,
      }
    : null);

  const handleScroll = () => {
    const container = contentRef.current;
    if (!container) return;
    const nearBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight < 90;
    setFollow(nearBottom);
  };

  const getAppendix = useCallback(() => {
    if (!includeTechnical) return '';
    return buildTechnicalAppendix(metaRef.current?.dossier ?? completed?.technical);
  }, [completed, includeTechnical]);

  const handleCopy = async () => {
    const text = completed?.markdown ?? markdown;
    if (!text.trim()) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
      onNotify('Relatório copiado para a área de transferência.', 'success');
    } catch {
      onNotify('Não foi possível copiar o relatório.', 'error');
    }
  };

  const handleTxt = () => {
    if (!completed) return;
    const text = formatReportAsText(completed, getAppendix());
    downloadBlob(
      new Blob([`\ufeff${text}`], { type: 'text/plain;charset=utf-8' }),
      buildDevReportFileName(completed, 'txt')
    );
    onNotify('Download do relatório em TXT iniciado.', 'success');
  };

  const handleJson = () => {
    const dossier = metaRef.current?.dossier;
    if (!dossier) {
      onNotify('Os dados técnicos desta sessão não estão mais disponíveis.', 'info');
      return;
    }
    const record =
      completed ??
      ({
        id: recordIdRef.current,
        url,
        title: meta?.title || reportHost(url),
        model: meta?.model || aiSettings.model,
        markdown,
        createdAt: createdAtRef.current,
      } satisfies DevReportRecord);
    downloadBlob(
      new Blob([JSON.stringify(dossier, null, 2)], { type: 'application/json;charset=utf-8' }),
      buildDevReportFileName(record, 'json')
    );
    onNotify('Dados técnicos exportados em JSON.', 'success');
  };

  const handlePdf = async () => {
    if (!completed || pdfBusy) return;
    setPdfBusy(true);
    try {
      const response = await fetch('/api/dev-report/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          markdown: completed.markdown,
          title: completed.title,
          url: completed.url,
          model: completed.model,
          createdAt: completed.createdAt,
          usage: completed.usage,
          technical: completed.technical,
          appendix: getAppendix(),
        }),
      });
      if (!response.ok) {
        let detail = 'Não foi possível gerar o PDF.';
        try {
          const body = await response.json();
          if (body?.error) detail = body.error;
        } catch {}
        throw new Error(detail);
      }
      const blob = await response.blob();
      downloadBlob(blob, buildDevReportFileName(completed, 'pdf'));
      onNotify('PDF do relatório gerado com sucesso.', 'success');
    } catch (caught) {
      onNotify((caught as Error).message || 'Falha ao gerar o PDF.', 'error');
    } finally {
      setPdfBusy(false);
    }
  };

  const running = isStreaming && !error;
  const depth = meta?.depth || aiSettings.depth;
  const usage = done?.usage ?? completed?.usage;
  const duration = done?.durationMs ?? completed?.durationMs;

  return (
    <div className="fixed inset-0 z-[66] flex items-center justify-center bg-[#03050a]/85 p-1.5 backdrop-blur-md sm:p-4">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dev-report-title"
        className="anim-in panel flex h-[min(96dvh,940px)] w-full max-w-[1180px] flex-col overflow-hidden"
      >
        {/* Cabeçalho */}
        <div className="flex shrink-0 items-start gap-3 border-b border-white/[0.07] px-3 py-3 sm:px-4">
          <span className="relative mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400/90 via-indigo-500 to-violet-600 text-white shadow-[0_8px_24px_-10px_rgba(99,102,241,0.9)] ring-1 ring-white/20">
            <Sparkles className="h-4 w-4" />
            {running && (
              <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 animate-pulse rounded-full border-2 border-[#080b12] bg-emerald-400" />
            )}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 id="dev-report-title" className="text-[15px] font-bold text-white">
                Relatório Dev
              </h2>
              <span className="chip chip-blue">
                {completed?.model || meta?.model || aiSettings.model}
              </span>
              {depth && (
                <span className="chip hidden sm:inline-flex">
                  {depth === 'max' ? 'profundidade máxima' : depth === 'fast' ? 'análise rápida' : 'equilíbrio'}
                </span>
              )}
              {incomplete && <span className="chip chip-amber">parcial</span>}
              {completed && !running && <span className="chip chip-emerald">concluído</span>}
            </div>
            <p
              className="mt-0.5 truncate font-mono text-[11px] text-slate-400"
              title={item?.url || url}
            >
              {item?.fileName ? `${item.fileName} · ` : ''}
              {item?.url || url}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              aria-label="Fechar relatório Dev"
              className="btn btn-ghost btn-icon h-8 w-8 text-slate-400 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-white/[0.06] bg-[#080b12]/70 px-3 py-2 sm:px-4">
          <div className="flex rounded-lg border border-white/[0.08] bg-black/30 p-0.5">
            <button
              type="button"
              onClick={() => setTab('report')}
              aria-pressed={tab === 'report'}
              className={cn(
                'flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[12px] font-semibold transition-colors',
                tab === 'report'
                  ? 'bg-white/[0.08] text-white'
                  : 'text-slate-400 hover:text-slate-200'
              )}
            >
              <BookOpen className="h-3.5 w-3.5" />
              Relatório
            </button>
            <button
              type="button"
              onClick={() => setTab('data')}
              aria-pressed={tab === 'data'}
              className={cn(
                'flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[12px] font-semibold transition-colors',
                tab === 'data'
                  ? 'bg-white/[0.08] text-white'
                  : 'text-slate-400 hover:text-slate-200'
              )}
            >
              <FileCode2 className="h-3.5 w-3.5" />
              Dados
              {meta?.dossier ? (
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden="true" />
              ) : null}
            </button>
          </div>

          {running && (
            <button
              type="button"
              onClick={() => setFollow((previous) => !previous)}
              aria-pressed={follow}
              className={cn(
                'btn btn-ghost btn-sm h-7 gap-1 px-2 text-[11.5px]',
                follow ? 'text-emerald-300' : 'text-slate-400'
              )}
              title="Acompanhar a geração automaticamente"
            >
              <ArrowDown className={cn('h-3 w-3', follow && 'animate-bounce')} />
              Acompanhar
            </button>
          )}

          <div className="ml-auto flex items-center gap-1.5">
            {Boolean(meta?.dossier) && (
              <button
                type="button"
                onClick={handleJson}
                className="btn btn-ghost btn-sm hidden text-slate-400 hover:text-slate-200 sm:inline-flex"
                title="Baixar os dados técnicos extraídos em JSON"
                aria-label="Baixar dados técnicos em JSON"
              >
                <CodeIcon />
                JSON
              </button>
            )}
            <button
              type="button"
              onClick={() => void handleCopy()}
              disabled={!markdown.trim()}
              className="btn btn-ghost btn-sm text-slate-300"
              title="Copiar Markdown do relatório"
              aria-label="Copiar Markdown do relatório"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-300" /> : <Copy className="h-3.5 w-3.5" />}
              <span className="hidden lg:inline">{copied ? 'Copiado' : 'Copiar'}</span>
            </button>
            <button
              type="button"
              onClick={handleTxt}
              disabled={!completed}
              className="btn btn-secondary btn-sm"
              title="Baixar relatório em TXT"
            >
              <FileText className="h-3.5 w-3.5 text-amber-300" />
              TXT
            </button>
            <button
              type="button"
              onClick={() => void handlePdf()}
              disabled={!completed || pdfBusy}
              className="btn btn-primary btn-sm"
              title="Baixar relatório em PDF"
              aria-label="Baixar relatório em PDF"
            >
              {pdfBusy ? <Spinner className="h-3.5 w-3.5" /> : <Download className="h-3.5 w-3.5" />}
              <span className="hidden sm:inline">{pdfBusy ? 'Gerando' : 'PDF'}</span>
            </button>
            <button
              type="button"
              onClick={() => void startGeneration()}
              disabled={running}
              className="btn btn-ghost btn-sm text-slate-400 hover:text-white"
              title={existing ? 'Gerar novamente este relatório' : 'Regenerar relatório'}
              aria-label="Regenerar relatório"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Corpo */}
        <div className="flex min-h-0 flex-1">
          {/* Metadados + sumário */}
          <aside className="hidden w-[246px] shrink-0 flex-col border-r border-white/[0.06] bg-[#070a11]/70 xl:flex">
            <div className="scroll-area min-h-0 flex-1 overflow-y-auto p-3">
              <ReportMeta
                model={completed?.model || meta?.model}
                technical={effectiveTechnical}
                usage={usage}
                durationMs={duration}
                reasoningChars={reasoningChars}
                docsChars={markdown.length}
              />

              {headings.length > 0 && (
                <div className="mt-4">
                  <p className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.14em] text-slate-400">
                    <ListTree className="h-3 w-3" />
                    Sumário
                  </p>
                  <nav className="mt-1.5 space-y-0.5" aria-label="Sumário do relatório">
                    {headings
                      .filter((heading) => heading.level === 2)
                      .map((heading) => (
                        <button
                          key={heading.id}
                          type="button"
                          onClick={() => {
                            const container = contentRef.current;
                            const target = container?.querySelector<HTMLElement>(
                              `#${CSS.escape(heading.id)}`
                            );
                            target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                          }}
                          className="block w-full truncate rounded-md px-1.5 py-1 text-left text-[11.5px] text-slate-400 transition-colors hover:bg-white/[0.04] hover:text-slate-200"
                          title={heading.title}
                        >
                          {heading.title}
                        </button>
                      ))}
                  </nav>
                </div>
              )}
            </div>
          </aside>

          {/* Conteúdo */}
          <div className="relative flex min-w-0 flex-1 flex-col">
            {running && (
              <div className="shrink-0 border-b border-white/[0.05] bg-[#0a0f18]/80 px-3 py-2 sm:px-4">
                <div className="flex items-center gap-2">
                  <Spinner className="h-3.5 w-3.5 text-amber-400" />
                  <p className="min-w-0 flex-1 truncate text-[12px] font-medium text-slate-200">
                    {stage?.message || 'Gerando relatório...'}
                  </p>
                  <span className="hidden shrink-0 font-mono text-[10.5px] text-slate-400 sm:inline">
                    {reasoningChars > 0 ? `raciocínio ${formatTokenCount(reasoningChars)} chars · ` : ''}
                    {formatTokenCount(markdown.length)} chars
                  </span>
                </div>
                <div
                  role="progressbar"
                  aria-label="Gerando relatório Dev"
                  aria-valuetext={stage?.message}
                  className="mt-1.5 h-[2px] w-full overflow-hidden rounded-full bg-white/[0.06]"
                >
                  <div className="shimmer h-full w-full bg-gradient-to-r from-sky-500 via-indigo-400 to-violet-400" />
                </div>
              </div>
            )}

            {error ? (
              <div className="flex flex-1 items-center justify-center p-5">
                <div className="max-w-md text-center">
                  <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl border border-rose-400/25 bg-rose-400/[0.08] text-rose-300">
                    <AlertTriangle className="h-5 w-5" />
                  </span>
                  <h3 className="mt-3 text-[15px] font-bold text-white">
                    Não foi possível concluir o relatório
                  </h3>
                  <p className="mt-1.5 text-[12.5px] leading-relaxed text-slate-400">{error}</p>
                  <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => void startGeneration()}
                      className="btn btn-primary btn-sm"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      Tentar novamente
                    </button>
                    <button
                      type="button"
                      onClick={onOpenAiSettings}
                      className="btn btn-secondary btn-sm"
                    >
                      <Settings2 className="h-3.5 w-3.5" />
                      Configurar API de IA
                    </button>
                  </div>
                </div>
              </div>
            ) : tab === 'data' ? (
              <DataTab
                dossier={metaRef.current?.dossier}
                technical={effectiveTechnical}
                onRegenerate={() => void startGeneration()}
                onOpenAiSettings={onOpenAiSettings}
              />
            ) : (
              <div
                ref={contentRef}
                onScroll={handleScroll}
                className="scroll-area min-h-0 flex-1 overflow-y-auto px-3 py-3.5 sm:px-5 sm:py-4"
              >
                {markdown.trim() ? (
                  <article
                    className="dev-report mx-auto max-w-[860px]"
                    dangerouslySetInnerHTML={{ __html: reportHtml }}
                  />
                ) : (
                  <StreamingPlaceholder stage={stage} reasoningChars={reasoningChars} />
                )}

                {running && markdown.trim() && (
                  <div className="mx-auto mt-6 flex max-w-[860px] items-center gap-2 rounded-lg border border-white/[0.07] bg-white/[0.02] px-3 py-2 text-[11.5px] text-slate-400">
                    <Spinner className="h-3 w-3 text-amber-400" />
                    {stage?.message || 'A IA ainda está escrevendo...'}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Rodapé */}
        <div className="flex shrink-0 flex-wrap items-center gap-2 border-t border-white/[0.07] bg-[#080b12]/90 px-3 py-2.5 sm:px-4">
          <label className="flex cursor-pointer items-center gap-2 text-[11.5px] text-slate-400">
            <input
              type="checkbox"
              checked={includeTechnical}
              onChange={(event) => setIncludeTechnical(event.target.checked)}
              className="h-3.5 w-3.5 rounded border-white/20 bg-black/40 accent-amber-500"
            />
            Incluir anexo técnico no TXT/PDF
          </label>
          <p className="min-w-0 flex-1 truncate text-[10.5px] text-slate-500">
            A análise é enviada à DeepSeek somente quando você solicita este relatório.
          </p>
          <span className="hidden font-mono text-[10.5px] text-slate-400 sm:inline">
            {usage ? `${formatTokenCount(usage.totalTokens)} tokens` : ''}
            {duration ? ` · ${formatClock(duration)}` : ''}
          </span>
          <button type="button" onClick={onClose} className="btn btn-secondary btn-sm">
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}

function CodeIcon() {
  return <FileCode2 className="h-3.5 w-3.5" />;
}

function ReportMeta({
  model,
  technical,
  usage,
  durationMs,
  reasoningChars,
  docsChars,
}: {
  model?: string;
  technical: DevReportRecord['technical'] | null;
  usage?: DevReportUsage;
  durationMs?: number;
  reasoningChars: number;
  docsChars: number;
}) {
  return (
    <div className="space-y-3">
      <div>
        <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-slate-400">
          Ficha técnica
        </p>
        <dl className="mt-1.5 space-y-1 text-[11px]">
          <MetaRow label="Modelo" value={model || '—'} mono />
          <MetaRow label="Status" value={technical?.statusCode ? String(technical.statusCode) : '—'} />
          <MetaRow label="Seções" value={technical ? String(technical.sections) : '—'} />
          <MetaRow label="Nós mapeados" value={technical ? String(technical.nodes) : '—'} />
          <MetaRow label="Imagens" value={technical ? String(technical.images) : '—'} />
          <MetaRow label="Imagem enviada" value={technical?.imageAttached ? 'sim' : 'não'} />
          <MetaRow label="Tokens" value={usage ? formatTokenCount(usage.totalTokens) : '—'} />
          <MetaRow label="Duração" value={durationMs ? formatClock(durationMs) : '—'} />
          {reasoningChars > 0 && (
            <MetaRow label="Raciocínio" value={`${formatTokenCount(reasoningChars)} chars`} />
          )}
          <MetaRow label="Relatório" value={docsChars >= 1000 ? `${(docsChars / 1000).toFixed(1)}k chars` : `${docsChars} chars`} />
        </dl>
      </div>

      {technical && technical.palette.length > 0 && (
        <div>
          <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-slate-400">
            Paleta
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1">
            {technical.palette.slice(0, 12).map((color) => (
              <span
                key={color}
                title={color}
                className="h-5 w-5 rounded border border-white/15"
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
          <p className="mt-1 truncate font-mono text-[9.5px] text-slate-500">
            {technical.palette.slice(0, 5).join(' · ')}
          </p>
        </div>
      )}

      {technical && technical.fonts.length > 0 && (
        <div>
          <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-slate-400">
            Fontes
          </p>
          <ul className="mt-1 space-y-0.5">
            {technical.fonts.slice(0, 6).map((font) => (
              <li key={font} className="truncate font-mono text-[10.5px] text-slate-300" title={font}>
                {font}
              </li>
            ))}
          </ul>
        </div>
      )}

      {technical && technical.breakpoints.length > 0 && (
        <div>
          <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-slate-400">
            Breakpoints
          </p>
          <p className="mt-1 font-mono text-[10.5px] leading-relaxed text-slate-300">
            {technical.breakpoints.slice(0, 10).join(' · ')}
          </p>
        </div>
      )}

      {technical?.imageAttached && (
        <p className="flex items-start gap-1.5 rounded-lg border border-sky-400/15 bg-sky-400/[0.04] px-2 py-1.5 text-[10.5px] leading-relaxed text-slate-400">
          <ImageIcon className="mt-0.5 h-3 w-3 shrink-0 text-sky-300" />
          A IA recebeu capturas da viewport para analisar composição visual.
        </p>
      )}
    </div>
  );
}

function MetaRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <dt className="text-slate-500">{label}</dt>
      <dd
        className={cn('truncate text-right text-slate-300', mono && 'font-mono text-[10.5px]')}
        title={value}
      >
        {value}
      </dd>
    </div>
  );
}

function StreamingPlaceholder({
  stage,
  reasoningChars,
}: {
  stage: DevReportStageEvent | null;
  reasoningChars: number;
}) {
  return (
    <div className="mx-auto max-w-[860px]">
      <div className="rounded-xl border border-white/[0.07] bg-white/[0.015] px-5 py-6">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-indigo-400/25 bg-indigo-400/[0.08] text-indigo-300">
            <Sparkles className="h-4 w-4" />
          </span>
          <div>
            <p className="text-[14px] font-bold text-white">Gerando o relatório Dev</p>
            <p className="mt-0.5 text-[11.5px] text-slate-400">
              {stage?.message || 'Preparando a análise...'}
            </p>
          </div>
        </div>

        {reasoningChars > 0 && (
          <p className="mt-3 flex items-center gap-1.5 font-mono text-[10.5px] text-indigo-300/80">
            <Spinner className="h-3 w-3" />
            raciocínio em andamento · {reasoningChars.toLocaleString('pt-BR')} caracteres
          </p>
        )}

        <div className="mt-5 space-y-2.5" aria-hidden="true">
          <div className="h-3.5 w-2/5 animate-pulse rounded bg-white/[0.07]" />
          <div className="h-2.5 w-full animate-pulse rounded bg-white/[0.04]" />
          <div className="h-2.5 w-11/12 animate-pulse rounded bg-white/[0.04]" />
          <div className="h-2.5 w-9/12 animate-pulse rounded bg-white/[0.04]" />
          <div className="mt-4 h-3 w-1/3 animate-pulse rounded bg-white/[0.06]" />
          <div className="h-2.5 w-full animate-pulse rounded bg-white/[0.04]" />
          <div className="h-2.5 w-10/12 animate-pulse rounded bg-white/[0.04]" />
          <div className="h-2.5 w-8/12 animate-pulse rounded bg-white/[0.04]" />
        </div>
      </div>
      <p className="mt-3 text-center text-[10.5px] text-slate-500">
        A análise completa pode levar de 30 segundos a alguns minutos, dependendo do modelo.
      </p>
    </div>
  );
}

function DataTab({
  dossier,
  technical,
  onRegenerate,
  onOpenAiSettings,
}: {
  dossier: unknown;
  technical: DevReportRecord['technical'] | null;
  onRegenerate: () => void;
  onOpenAiSettings: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const json = useMemo(() => {
    if (!dossier) return '';
    try {
      return JSON.stringify(dossier, null, 2);
    } catch {
      return '';
    }
  }, [dossier]);

  return (
    <div className="scroll-area min-h-0 flex-1 overflow-y-auto px-3 py-3.5 sm:px-5">
      <div className="mx-auto max-w-[900px]">
        <div className="flex flex-wrap items-start gap-3 rounded-xl border border-white/[0.07] bg-white/[0.015] px-4 py-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-sky-400/20 bg-sky-400/[0.08] text-sky-300">
            <Clipboard className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[13.5px] font-bold text-white">Dados extraídos do navegador</p>
            <p className="mt-0.5 text-[11.5px] leading-relaxed text-slate-400">
              DOM, CSSOM, tipografia, cores, componentes, mídia, stack e acessibilidade enviados
              como contexto para a IA.
            </p>
          </div>
          {json && (
            <button
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(json);
                  setCopied(true);
                  window.setTimeout(() => setCopied(false), 1600);
                } catch {}
              }}
              className="btn btn-secondary btn-sm"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-300" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? 'Copiado' : 'Copiar JSON'}
            </button>
          )}
        </div>

        {technical && (
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              { label: 'Seções', value: technical.sections },
              { label: 'Nós do outline', value: technical.nodes },
              { label: 'Imagens', value: technical.images },
              { label: 'Scripts', value: technical.scripts },
            ].map((entry) => (
              <div
                key={entry.label}
                className="rounded-lg border border-white/[0.06] bg-black/20 px-2.5 py-2"
              >
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                  {entry.label}
                </p>
                <p className="mt-0.5 font-mono text-[15px] font-semibold text-slate-200">
                  {entry.value}
                </p>
              </div>
            ))}
          </div>
        )}

        {json ? (
          <pre className="mt-3 max-h-[calc(100dvh-360px)] overflow-auto rounded-xl border border-white/[0.07] bg-[#05080e] p-3 font-mono text-[11px] leading-relaxed text-slate-300">
            {json}
          </pre>
        ) : (
          <div className="mt-4 rounded-xl border border-dashed border-white/[0.1] px-5 py-8 text-center">
            <Maximize2 className="mx-auto h-5 w-5 text-slate-500" />
            <p className="mt-2 text-[13px] font-semibold text-slate-300">
              Os dados técnicos não estão disponíveis nesta sessão
            </p>
            <p className="mx-auto mt-1 max-w-sm text-[11.5px] leading-relaxed text-slate-500">
              Relatórios carregados do histórico preservam o documento e a ficha técnica, mas não
              mantêm o dossiê bruto. Gere novamente para inspecionar os dados.
            </p>
            <button
              type="button"
              onClick={onRegenerate}
              className="btn btn-primary btn-sm mt-3"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Gerar novamente
            </button>
            <button
              type="button"
              onClick={onOpenAiSettings}
              className="btn btn-secondary btn-sm mt-3 ml-2"
            >
              <Settings2 className="h-3.5 w-3.5" />
              Configurar IA
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
