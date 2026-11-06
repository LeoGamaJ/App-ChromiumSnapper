import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import JSZip from 'jszip';
import { LandingPage } from './components/LandingPage';
import { ConfigPanel, type TabId } from './components/ConfigPanel';
import { ConfigRail } from './components/ConfigRail';
import { PreviewDialog } from './components/PreviewDialog';
import { ResultsPanel, type GalleryFilter } from './components/ResultsPanel';
import { ShortcutsDialog } from './components/ShortcutsDialog';
import { TopBar } from './components/TopBar';
import { Inspector, InspectorRail } from './components/Inspector';
import { ToastStack, type ToastItem, type ToastKind } from './components/ui';
import { usePersistentState } from './hooks/usePersistentState';
import { useMediaQuery } from './hooks/useMediaQuery';
import {
  DEFAULT_SETTINGS,
  DEFAULT_URLS,
  MAX_URLS,
  formatClock,
  parseUrls,
  timestampSlug,
  type CaptureSettings,
  type CapturedItem,
  type LastRun,
  type RunProgress,
} from './lib/snapper';

function getInitialUrls(): string {
  try {
    const stored = window.localStorage.getItem('snapper.v2.urls');
    if (stored !== null) {
      try {
        const parsed = JSON.parse(stored);
        if (typeof parsed === 'string') return parsed;
      } catch {
        // Corrupted payload: fall back to the legacy key below.
      }
    }
    return window.localStorage.getItem('snapper_history_urls') ?? DEFAULT_URLS;
  } catch {
    return DEFAULT_URLS;
  }
}

async function blobToPng(blob: Blob): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(blob);
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const context = canvas.getContext('2d');
      if (!context) {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('Canvas indisponível'));
        return;
      }
      context.drawImage(image, 0, 0);
      canvas.toBlob((png) => {
        URL.revokeObjectURL(objectUrl);
        if (png) resolve(png);
        else reject(new Error('Falha ao converter imagem'));
      }, 'image/png');
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Falha ao carregar imagem'));
    };
    image.src = objectUrl;
  });
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

export default function App() {
  const [storedSettings, setStoredSettings] = usePersistentState<CaptureSettings>(
    'snapper.v2.settings',
    DEFAULT_SETTINGS
  );
  const settings = useMemo<CaptureSettings>(
    () => ({ ...DEFAULT_SETTINGS, ...storedSettings }),
    [storedSettings]
  );

  const initialUrls = useMemo(getInitialUrls, []);
  const [rawUrls, setRawUrls] = usePersistentState<string>('snapper.v2.urls', initialUrls);
  const urls = useMemo(() => parseUrls(rawUrls), [rawUrls]);

  const [items, setItems] = useState<CapturedItem[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState<RunProgress>({
    total: 0,
    finished: 0,
    statusText: '',
    step: 'idle',
  });
  const [lastRun, setLastRun] = useState<LastRun | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [filter, setFilter] = useState<GalleryFilter>('all');
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [configOpen, setConfigOpen] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [configTab, setConfigTab] = useState<TabId>('links');
  const [configCollapsed, setConfigCollapsed] = usePersistentState<boolean>(
    'snapper.v2.configCollapsed',
    false
  );
  const [inspectorCollapsed, setInspectorCollapsed] = usePersistentState<boolean>(
    'snapper.v2.inspectorCollapsed',
    false
  );
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const [zipState, setZipState] = useState({ active: false, done: 0, total: 0 });
  const [clearArmed, setClearArmed] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [view, setView] = useState<'landing' | 'app'>(() => {
    try {
      return window.sessionStorage.getItem('snapper.workspace') === '1' ? 'app' : 'landing';
    } catch {
      return 'landing';
    }
  });

  const runningRef = useRef(false);
  const zipActiveRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const startedAtRef = useRef(0);
  const statsRef = useRef({ total: 0, success: 0, failed: 0 });
  const toastIdRef = useRef(0);
  const toastTimersRef = useRef<Map<number, number>>(new Map());

  const updateSettings = useCallback(
    (patch: Partial<CaptureSettings>) => {
      setStoredSettings((previous) => ({
        ...DEFAULT_SETTINGS,
        ...previous,
        ...patch,
      }));
    },
    [setStoredSettings]
  );

  const dismissToast = useCallback((id: number) => {
    const timer = toastTimersRef.current.get(id);
    if (timer) window.clearTimeout(timer);
    toastTimersRef.current.delete(id);
    setToasts((previous) => previous.filter((toast) => toast.id !== id));
  }, []);

  const pushToast = useCallback((message: string, kind: ToastKind = 'info') => {
    const id = ++toastIdRef.current;
    setToasts((previous) => [...previous.slice(-2), { id, kind, message }]);
    const timer = window.setTimeout(() => {
      setToasts((previous) => previous.filter((toast) => toast.id !== id));
      toastTimersRef.current.delete(id);
    }, 4500);
    toastTimersRef.current.set(id, timer);
  }, []);

  useEffect(() => {
    const timers = toastTimersRef.current;
    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, []);

  useEffect(() => {
    if (!isRunning) return;
    const update = () => setElapsedMs(Date.now() - startedAtRef.current);
    update();
    const timer = window.setInterval(update, 500);
    return () => window.clearInterval(timer);
  }, [isRunning]);

  useEffect(() => {
    if (!clearArmed) return;
    const timer = window.setTimeout(() => setClearArmed(false), 3500);
    return () => window.clearTimeout(timer);
  }, [clearArmed]);

  useEffect(() => {
    if (filter !== 'error') return;
    const hasFailed = items.some((item) => Boolean(item.error) || !item.dataUrl);
    if (!hasFailed) setFilter('all');
  }, [filter, items]);

  useEffect(() => {
    if (previewId && !items.some((item) => item.id === previewId)) {
      setPreviewId(null);
    }
  }, [items, previewId]);

  useEffect(() => {
    if (selectedId && items.some((item) => item.id === selectedId)) return;
    setSelectedId(items.length > 0 ? items[items.length - 1].id : null);
  }, [items, selectedId]);

  useEffect(() => {
    if (isDesktop) setConfigOpen(false);
  }, [isDesktop]);

  useEffect(() => {
    if (items.length === 0) setLastRun(null);
  }, [items.length]);

  /* ------------------------------- Capture run ------------------------------ */

  const runCapture = useCallback(
    async (targetUrls: string[], retryOf?: string) => {
      if (runningRef.current) return;

      const cleaned = targetUrls.map((url) => url.trim()).filter(Boolean);
      if (cleaned.length === 0) {
        pushToast('Adicione ao menos uma URL para capturar.', 'error');
        return;
      }
      if (cleaned.length > MAX_URLS) {
        pushToast(`Limite de ${MAX_URLS} URLs por lote. Reduza a lista para continuar.`, 'error');
        return;
      }
      const sanitized = cleaned;

      const snapshot: CaptureSettings = { ...settings };
      runningRef.current = true;
      setIsRunning(true);
      setLastRun(null);
      setProgress({
        total: sanitized.length,
        finished: 0,
        statusText: `Iniciando a captura para ${sanitized.length} ${
          sanitized.length === 1 ? 'link' : 'links'
        }...`,
        step: 'init',
      });

      const startedAt = Date.now();
      startedAtRef.current = startedAt;
      setElapsedMs(0);
      statsRef.current = { total: sanitized.length, success: 0, failed: 0 };

      const controller = new AbortController();
      abortRef.current = controller;
      let interrupted = false;
      let completed = false;
      let fatalMessage = '';

      const removeRetriedItem = () => {
        if (!retryOf) return;
        setItems((previous) => previous.filter((item) => item.id !== retryOf));
      };

      const handleEventBlock = (block: string) => {
        const lines = block.split('\n');
        let eventName = 'message';
        const dataLines: string[] = [];

        for (const line of lines) {
          if (line.startsWith('event:')) eventName = line.slice(6).trim();
          else if (line.startsWith('data:')) dataLines.push(line.slice(5).trimStart());
        }
        if (dataLines.length === 0) return;

        let payload: Record<string, any>;
        try {
          payload = JSON.parse(dataLines.join('\n'));
        } catch {
          return;
        }

        if (eventName === 'start') {
          setProgress((previous) => ({
            ...previous,
            total: Number(payload.total) || previous.total,
            statusText: `Iniciando captura de ${payload.total} ${
              Number(payload.total) === 1 ? 'link' : 'links'
            }...`,
            step: 'running',
          }));
        } else if (eventName === 'item_start') {
          setProgress((previous) => ({
            ...previous,
            finished: Math.min(Number(payload.index) || 0, previous.total),
            statusText: `[${Number(payload.index) + 1}/${previous.total}] Acessando ${
              payload.url
            }...`,
            step: 'loading',
          }));
        } else if (eventName === 'item_step') {
          setProgress((previous) => ({
            ...previous,
            statusText: `[${Number(payload.index) + 1}/${previous.total}] ${payload.status}`,
            step: payload.step || previous.step,
          }));
        } else if (eventName === 'item_success') {
          removeRetriedItem();
          const newItem: CapturedItem = {
            id: `${Date.now()}_${payload.index}_${Math.random().toString(36).slice(2, 7)}`,
            index: Number(payload.index) || 0,
            url: payload.url,
            fileName: payload.fileName,
            format: payload.format,
            byteSize: payload.byteSize,
            dimensions: payload.dimensions,
            durationMs: payload.durationMs,
            dataUrl: payload.dataUrl,
            previewDataUrl: payload.previewDataUrl || payload.dataUrl,
            capturedAt: new Date().toLocaleTimeString('pt-BR'),
            imgStats: payload.imgStats,
          };
          statsRef.current.success += 1;
          setItems((previous) => [...previous, newItem]);
          setSelectedId(newItem.id);
          setProgress((previous) => ({
            ...previous,
            finished: Number(payload.index) + 1,
            statusText: `[${Number(payload.index) + 1}/${previous.total}] Captura concluída.`,
            step: 'item_done',
          }));
        } else if (eventName === 'item_error') {
          removeRetriedItem();
          const errorItem: CapturedItem = {
            id: `${Date.now()}_err_${payload.index}_${Math.random().toString(36).slice(2, 7)}`,
            index: Number(payload.index) || 0,
            url: payload.url,
            fileName: payload.fileName,
            format: snapshot.format,
            byteSize: 0,
            dimensions: { pageWidth: snapshot.width, pageHeight: 0 },
            durationMs: payload.durationMs || 0,
            dataUrl: '',
            error: payload.error || 'Falha ao renderizar a página.',
            capturedAt: new Date().toLocaleTimeString('pt-BR'),
          };
          statsRef.current.failed += 1;
          setItems((previous) => [...previous, errorItem]);
          setProgress((previous) => ({
            ...previous,
            finished: Number(payload.index) + 1,
            statusText: `[${Number(payload.index) + 1}/${previous.total}] Falha: ${payload.error}`,
            step: 'item_error',
          }));
        } else if (eventName === 'complete') {
          completed = true;
          setProgress((previous) => ({
            ...previous,
            finished: previous.total,
            statusText: 'Lote finalizado. Todos os arquivos foram processados.',
            step: 'completed',
          }));
        } else if (eventName === 'fatal_error') {
          fatalMessage = payload.error || 'Erro fatal no Chromium.';
          setProgress((previous) => ({
            ...previous,
            statusText: fatalMessage,
            step: 'item_error',
          }));
        }
      };

      try {
        const response = await fetch('/api/screenshot/stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            urls: sanitized,
            format: snapshot.format,
            quality: snapshot.quality,
            width: snapshot.width,
            height: snapshot.height,
            fullPage: snapshot.fullPage,
            enableAutoScroll: snapshot.autoScroll,
            delayMs: snapshot.delayMs,
            heroWaitMs: snapshot.heroWaitMs,
            stabilizeTextures: snapshot.stabilizeTextures,
            removeExcessGrain: snapshot.removeExcessGrain,
            hideCookieBanners: snapshot.hideCookieBanners,
            colorScheme: snapshot.colorScheme,
            namingPattern: snapshot.namingPattern,
            customHeaders: snapshot.customHeaders,
            customCookies: snapshot.customCookies,
          }),
        });

        if (!response.ok) {
          let detail = `Falha no servidor (${response.status})`;
          try {
            const body = await response.json();
            if (body?.error) detail = body.error;
          } catch {
            // Response body was not JSON; keep the status-based message.
          }
          throw new Error(detail);
        }
        if (!response.body) {
          throw new Error('Streaming não é suportado por este navegador.');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          buffer = buffer.replace(/\r\n/g, '\n');

          let separator = buffer.indexOf('\n\n');
          while (separator !== -1) {
            const block = buffer.slice(0, separator);
            buffer = buffer.slice(separator + 2);
            if (block.trim()) handleEventBlock(block);
            separator = buffer.indexOf('\n\n');
          }
        }
        if (buffer.trim()) handleEventBlock(buffer);

        if (!completed && !fatalMessage) {
          pushToast('A conexão foi encerrada antes da conclusão do lote.', 'error');
        }
      } catch (error) {
        if ((error as Error).name === 'AbortError') {
          interrupted = true;
        } else {
          pushToast(
            `Não foi possível capturar: ${(error as Error).message || 'falha de conexão'}.`,
            'error'
          );
        }
      } finally {
        const durationMs = Date.now() - startedAt;
        const stats = statsRef.current;
        runningRef.current = false;
        abortRef.current = null;
        setIsRunning(false);
        setElapsedMs(durationMs);

        if (fatalMessage) {
          pushToast(fatalMessage, 'error');
        }

        if (stats.success + stats.failed > 0 || interrupted) {
          setLastRun({
            total: stats.total,
            success: stats.success,
            failed: stats.failed,
            durationMs,
            interrupted,
          });
        }

        if (interrupted) {
          pushToast('Captura interrompida pelo usuário.', 'info');
        } else if (stats.success + stats.failed > 0) {
          if (stats.failed > 0) {
            pushToast(
              `Lote finalizado: ${stats.success} capturadas e ${stats.failed} ${
                stats.failed === 1 ? 'falha' : 'falhas'
              }.`,
              'info'
            );
          } else {
            pushToast(
              `${stats.success} ${stats.success === 1 ? 'captura pronta' : 'capturas prontas'} em ${formatClock(durationMs)}.`,
              'success'
            );
          }
        }
      }
    },
    [pushToast, settings]
  );

  const handleRun = useCallback(() => {
    void runCapture(urls);
  }, [runCapture, urls]);

  const handleStop = useCallback(() => {
    if (!abortRef.current) return;
    abortRef.current.abort();
    setProgress((previous) => ({
      ...previous,
      statusText: 'Interrompendo a captura...',
      step: 'stopping',
    }));
  }, []);

  const handleRetry = useCallback(
    (item: CapturedItem) => {
      void runCapture([item.url], item.id);
    },
    [runCapture]
  );

  /* --------------------------------- Actions -------------------------------- */

  const handleDownloadSingle = useCallback(
    (item: CapturedItem) => {
      if (!item.dataUrl) return;
      const anchor = document.createElement('a');
      anchor.href = item.dataUrl;
      anchor.download = item.fileName || `capture.${item.format}`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      pushToast(`Download de ${item.fileName} iniciado.`, 'success');
    },
    [pushToast]
  );

  const handlePreview = useCallback((item: CapturedItem) => {
    setSelectedId(item.id);
    setPreviewId(item.id);
  }, []);

  const handleSelect = useCallback((item: CapturedItem) => {
    setSelectedId(item.id);
  }, []);

  const handleCopyImage = useCallback(
    async (item: CapturedItem) => {
      if (!item.dataUrl || item.format === 'pdf') return;
      try {
        if (!navigator.clipboard || typeof ClipboardItem === 'undefined') {
          throw new Error('Clipboard API indisponível');
        }
        const sourceBlob = await (await fetch(item.dataUrl)).blob();
        const pngBlob =
          sourceBlob.type === 'image/png' ? sourceBlob : await blobToPng(sourceBlob);
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': pngBlob })]);
        pushToast('Imagem copiada para a área de transferência.', 'success');
      } catch {
        pushToast('O navegador bloqueou a cópia. Use o download do arquivo.', 'error');
      }
    },
    [pushToast]
  );

  const handleZip = useCallback(async () => {
    const validItems = items.filter((item) => item.dataUrl && !item.error);
    if (validItems.length === 0 || zipActiveRef.current) return;

    zipActiveRef.current = true;
    setZipState({ active: true, done: 0, total: validItems.length });

    try {
      const zip = new JSZip();
      validItems.forEach((item, index) => {
        const base64 = item.dataUrl.split(',')[1];
        if (!base64) return;
        zip.file(item.fileName || `capture-${index + 1}.${item.format}`, base64, {
          base64: true,
        });
      });

      const blob = await zip.generateAsync(
        {
          type: 'blob',
          compression: 'DEFLATE',
          compressionOptions: { level: 6 },
        },
        (metadata) => {
          const done = Math.min(
            validItems.length,
            Math.max(0, Math.round((metadata.percent / 100) * validItems.length))
          );
          setZipState((previous) => ({ ...previous, done }));
        }
      );

      downloadBlob(blob, `chromium-snapper_${timestampSlug()}.zip`);
      pushToast(
        `ZIP com ${validItems.length} ${validItems.length === 1 ? 'arquivo' : 'arquivos'} gerado.`,
        'success'
      );
    } catch {
      pushToast('Não foi possível gerar o arquivo ZIP.', 'error');
    } finally {
      zipActiveRef.current = false;
      setZipState({ active: false, done: 0, total: 0 });
    }
  }, [items, pushToast]);

  const handleRemove = useCallback((id: string) => {
    setItems((previous) => previous.filter((item) => item.id !== id));
  }, []);

  const enterWorkspace = useCallback(() => {
    try {
      window.sessionStorage.setItem('snapper.workspace', '1');
    } catch {}
    setView('app');
    setConfigOpen(false);
    window.scrollTo(0, 0);
  }, []);

  const goToLanding = useCallback(() => {
    try {
      window.sessionStorage.removeItem('snapper.workspace');
    } catch {}
    setView('landing');
    window.scrollTo(0, 0);
  }, []);

  const handleClear = useCallback(() => {
    if (!clearArmed) {
      setClearArmed(true);
      return;
    }
    setItems([]);
    setLastRun(null);
    setPreviewId(null);
    setFilter('all');
    setClearArmed(false);
    pushToast('Galeria limpa.', 'info');
  }, [clearArmed, pushToast]);

  const handleResetSettings = useCallback(() => {
    setStoredSettings({ ...DEFAULT_SETTINGS });
    pushToast('Configurações restauradas para o padrão.', 'info');
  }, [pushToast, setStoredSettings]);

  const handleTrySample = useCallback(() => {
    setRawUrls(DEFAULT_URLS);
    void runCapture(parseUrls(DEFAULT_URLS));
  }, [runCapture, setRawUrls]);

  /* ------------------------------- Shortcuts -------------------------------- */

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (view !== 'app' || previewId || shortcutsOpen) return;
      const target = event.target as HTMLElement | null;
      const typing =
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.isContentEditable;
      const modifier = event.metaKey || event.ctrlKey;

      if (modifier && event.key === 'Enter') {
        event.preventDefault();
        if (!runningRef.current && urls.length > 0) {
          void runCapture(urls);
        }
        return;
      }
      if (event.key === 'Escape' && configOpen) {
        setConfigOpen(false);
        return;
      }
      if (!modifier && !typing && event.key.toLowerCase() === 'f') {
        event.preventDefault();
        setFocusMode((previous) => !previous);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [configOpen, previewId, runCapture, shortcutsOpen, urls, view]);

  /* --------------------------------- Render --------------------------------- */

  const previewableItems = useMemo(
    () => items.filter((item) => item.dataUrl && !item.error),
    [items]
  );
  const previewItem = previewId
    ? previewableItems.find((item) => item.id === previewId) ?? null
    : null;

  if (view === 'landing') {
    return (
      <>
        <LandingPage onLogin={enterWorkspace} />
        <ToastStack toasts={toasts} onDismiss={dismissToast} />
      </>
    );
  }

  return (
    <div className="workspace-shell relative flex h-dvh flex-col overflow-hidden bg-[#05070c] text-slate-200">
      <TopBar
        urlCount={urls.length}
        canCapture={urls.length > 0 && urls.length <= MAX_URLS}
        isRunning={isRunning}
        isFocusMode={focusMode}
        isConfigCollapsed={configCollapsed}
        isInspectorCollapsed={inspectorCollapsed}
        onToggleConfigCollapsed={() => setConfigCollapsed((previous) => !previous)}
        onToggleInspectorCollapsed={() => setInspectorCollapsed((previous) => !previous)}
        onCapture={handleRun}
        onStop={handleStop}
        onShowShortcuts={() => setShortcutsOpen(true)}
        onToggleFocus={() => setFocusMode((previous) => !previous)}
        onToggleConfig={() => setConfigOpen((previous) => !previous)}
        onNavigateHome={goToLanding}
      />

      <div className="relative flex min-h-0 flex-1">
        {!isDesktop && configOpen && (
          <>
            <button
              type="button"
              aria-label="Fechar configuração"
              onClick={() => setConfigOpen(false)}
              className="fixed inset-0 top-[54px] z-40 bg-black/65 backdrop-blur-[2px]"
            />
            <aside
              className="fixed inset-y-0 left-0 z-50 mt-[54px] flex w-[min(92vw,360px)] flex-col border-r border-white/[0.07] bg-[#080b12] shadow-2xl shadow-black/60"
              aria-label="Painel de configuração"
            >
              <ConfigPanel
                settings={settings}
                onChange={updateSettings}
                rawUrls={rawUrls}
                onRawUrlsChange={setRawUrls}
                urls={urls}
                isRunning={isRunning}
                tab={configTab}
                onTabChange={setConfigTab}
                onRun={handleRun}
                onStop={handleStop}
                onReset={handleResetSettings}
                onClose={() => setConfigOpen(false)}
              />
            </aside>
          </>
        )}

        {isDesktop && !focusMode && (
          configCollapsed ? (
            <ConfigRail
              activeTab={configTab}
              urlCount={urls.length}
              canRun={urls.length > 0 && urls.length <= MAX_URLS}
              isRunning={isRunning}
              onTabChange={setConfigTab}
              onExpand={() => setConfigCollapsed(false)}
              onRun={handleRun}
              onStop={handleStop}
            />
          ) : (
            <aside
              className="flex w-[348px] shrink-0 flex-col border-r border-white/[0.07] bg-[#080b12]"
              aria-label="Painel de configuração"
            >
              <ConfigPanel
                settings={settings}
                onChange={updateSettings}
                rawUrls={rawUrls}
                onRawUrlsChange={setRawUrls}
                urls={urls}
                isRunning={isRunning}
                tab={configTab}
                onTabChange={setConfigTab}
                onRun={handleRun}
                onStop={handleStop}
                onReset={handleResetSettings}
                onCollapse={() => setConfigCollapsed(true)}
              />
            </aside>
          )
        )}

        <main className="relative flex min-h-0 min-w-0 flex-1 flex-col">
          <h1 className="sr-only">Workspace de captura em lote</h1>
          <ResultsPanel
            items={items}
            isRunning={isRunning}
            progress={progress}
            elapsedMs={elapsedMs}
            lastRun={lastRun}
            settings={settings}
            urlCount={urls.length}
            filter={filter}
            selectedId={selectedId}
            onFilterChange={setFilter}
            onSelect={handleSelect}
            onPreview={handlePreview}
            onDownload={handleDownloadSingle}
            onCopy={handleCopyImage}
            onRemove={handleRemove}
            onRetry={handleRetry}
            onZip={handleZip}
            onClear={handleClear}
            onTrySample={handleTrySample}
            onShowShortcuts={() => setShortcutsOpen(true)}
            zipState={zipState}
            clearArmed={clearArmed}
          />
        </main>

        {!focusMode &&
          (inspectorCollapsed ? (
            <InspectorRail
              itemCount={items.length}
              hasSelection={Boolean(selectedId)}
              isRunning={isRunning}
              onExpand={() => setInspectorCollapsed(false)}
            />
          ) : (
            <div className="hidden h-full min-h-0 2xl:flex">
              <Inspector
                items={items}
                selectedId={selectedId}
                isRunning={isRunning}
                progress={progress}
                elapsedMs={elapsedMs}
                lastRun={lastRun}
                settings={settings}
                urlCount={urls.length}
                onSelect={handleSelect}
                onPreview={handlePreview}
                onDownload={handleDownloadSingle}
                onCopy={handleCopyImage}
                onRemove={handleRemove}
                onRetry={handleRetry}
                onCollapse={() => setInspectorCollapsed(true)}
              />
            </div>
          ))}
      </div>

      {previewItem && (
        <PreviewDialog
          item={previewItem}
          items={previewableItems}
          onClose={() => setPreviewId(null)}
          onNavigate={(item) => {
            setSelectedId(item.id);
            setPreviewId(item.id);
          }}
          onDownload={handleDownloadSingle}
          onCopy={handleCopyImage}
        />
      )}

      {shortcutsOpen && <ShortcutsDialog onClose={() => setShortcutsOpen(false)} />}

      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
