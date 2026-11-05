/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Camera,
  Download,
  Monitor,
  Smartphone,
  Tablet,
  Check,
  AlertCircle,
  Trash2,
  Play,
  Square,
  Maximize2,
  Sliders,
  Copy,
  FileArchive,
  Layers,
  X,
  ZoomIn,
  ZoomOut,
  Globe,
  FileText,
  Key,
  ChevronDown,
  ChevronUp,
  FileCode,
  Tag,
  Sparkles,
  Clock,
  Palette
} from 'lucide-react';

interface CapturedItem {
  id: string;
  index: number;
  url: string;
  fileName: string;
  format: 'png' | 'webp' | 'jpg' | 'pdf';
  byteSize: number;
  dimensions: {
    pageWidth: number;
    pageHeight: number;
  };
  durationMs: number;
  dataUrl: string;
  previewDataUrl?: string;
  error?: string;
  capturedAt: string;
  imgStats?: {
    total: number;
    completed: number;
  };
}

interface ViewportPreset {
  id: string;
  name: string;
  icon: typeof Monitor;
  width: number;
  height: number;
  desc: string;
}

const VIEWPORT_PRESETS: ViewportPreset[] = [
  { id: 'desktop-fhd', name: 'Desktop Full HD', icon: Monitor, width: 1920, height: 1080, desc: '1920 × 1080' },
  { id: 'desktop-4k', name: 'Desktop 4K', icon: Monitor, width: 3840, height: 2160, desc: '3840 × 2160' },
  { id: 'laptop', name: 'Laptop Pro', icon: Monitor, width: 1440, height: 900, desc: '1440 × 900' },
  { id: 'tablet', name: 'Tablet iPad', icon: Tablet, width: 768, height: 1024, desc: '768 × 1024' },
  { id: 'mobile', name: 'Mobile iPhone', icon: Smartphone, width: 390, height: 844, desc: '390 × 844' },
];

const QUICK_PRESETS = [
  {
    name: 'Tech & Dev',
    urls: 'github.com\nnews.ycombinator.com\nstackoverflow.com',
  },
  {
    name: 'Notícias & Mídia',
    urls: 'uol.com.br\ng1.globo.com\ncnnbrasil.com.br',
  },
  {
    name: 'Design & Portfólio',
    urls: 'leogama.com\nbijoutech.netlify.app\napple.com',
  },
];

const NAMING_PRESETS = [
  { label: '[ordem]_[url]_[resolucao]', pattern: '[ordem]_[url]_[resolucao]' },
  { label: '[data]_[url]_[resolucao]', pattern: '[data]_[url]_[resolucao]' },
  { label: '[ordem]_[url]', pattern: '[ordem]_[url]' },
  { label: '[data]_[ordem]_[url]', pattern: '[data]_[ordem]_[url]' },
];

export default function App() {
  // Input State
  const [rawUrls, setRawUrls] = useState<string>(
    'leogama.com\nbijoutech.netlify.app\nuol.com.br'
  );
  const [format, setFormat] = useState<'webp' | 'png' | 'jpg' | 'pdf'>('webp');
  const [quality, setQuality] = useState<number>(85);
  const [selectedPreset, setSelectedPreset] = useState<string>('desktop-fhd');
  const [customWidth, setCustomWidth] = useState<number>(1920);
  const [customHeight, setCustomHeight] = useState<number>(1080);
  const [fullPage, setFullPage] = useState<boolean>(true);
  const [enableAutoScroll, setEnableAutoScroll] = useState<boolean>(true);
  const [hideCookieBanners, setHideCookieBanners] = useState<boolean>(true);
  const [delayMs, setDelayMs] = useState<number>(1200);
  const [colorScheme, setColorScheme] = useState<'no-preference' | 'dark' | 'light'>('no-preference');

  // Advanced Optimization States
  const [namingPattern, setNamingPattern] = useState<string>('[ordem]_[url]_[resolucao]');
  const [customHeaders, setCustomHeaders] = useState<string>('');
  const [customCookies, setCustomCookies] = useState<string>('');
  const [showAuthSection, setShowAuthSection] = useState<boolean>(false);

  // Hero Loading & Texture Stabilization States
  const [heroWaitMs, setHeroWaitMs] = useState<number>(2000);
  const [stabilizeTextures, setStabilizeTextures] = useState<boolean>(true);
  const [removeExcessGrain, setRemoveExcessGrain] = useState<boolean>(false);

  // Execution State
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [currentProgress, setCurrentProgress] = useState<{
    total: number;
    current: number;
    statusText: string;
    step: string;
  }>({ total: 0, current: 0, statusText: '', step: 'idle' });

  // Captured Results
  const [capturedItems, setCapturedItems] = useState<CapturedItem[]>([]);
  const [previewModalItem, setPreviewModalItem] = useState<CapturedItem | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isZipping, setIsZipping] = useState<boolean>(false);

  const abortControllerRef = useRef<AbortController | null>(null);

  // Load history from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('snapper_history_urls');
      if (saved) setRawUrls(saved);

      const savedPattern = localStorage.getItem('snapper_naming_pattern');
      if (savedPattern) setNamingPattern(savedPattern);
    } catch {}
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 4000);
  };

  const urlList = rawUrls
    .split('\n')
    .map((u) => u.trim())
    .filter((u) => u.length > 0);

  const handlePresetChange = (presetId: string) => {
    setSelectedPreset(presetId);
    const p = VIEWPORT_PRESETS.find((item) => item.id === presetId);
    if (p) {
      setCustomWidth(p.width);
      setCustomHeight(p.height);
    }
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsRunning(false);
    setCurrentProgress((prev) => ({
      ...prev,
      statusText: 'Captura interrompida pelo usuário.',
      step: 'stopped',
    }));
    showToast('Captura interrompida');
  };

  // Helper for live preview of sample filename
  const getSampleFileName = () => {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '-');
    let res = namingPattern
      .replace(/\[url\]/gi, 'exemplo_site')
      .replace(/\[data\]/gi, dateStr)
      .replace(/\[hora\]/gi, timeStr)
      .replace(/\[ordem\]/gi, '01')
      .replace(/\[resolucao\]/gi, `${customWidth}x${customHeight}`)
      .replace(/\[formato\]/gi, format);
    res = res.replace(/[^a-z0-9_\-\.]/gi, '_').replace(/_+/g, '_').toLowerCase();
    if (!res.endsWith(`.${format}`)) res = `${res}.${format}`;
    return res;
  };

  // Start Batch Capture with Server-Sent Streaming
  const handleStartCapture = async () => {
    if (urlList.length === 0) {
      showToast('Por favor, adicione pelo menos uma URL para capturar.');
      return;
    }

    try {
      localStorage.setItem('snapper_history_urls', rawUrls);
      localStorage.setItem('snapper_naming_pattern', namingPattern);
    } catch {}

    setIsRunning(true);
    setCurrentProgress({
      total: urlList.length,
      current: 0,
      statusText: `Preparando Chromium Headless (${format.toUpperCase()}) para ${urlList.length} site(s)...`,
      step: 'init',
    });

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const response = await fetch('/api/screenshot/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: abortController.signal,
        body: JSON.stringify({
          urls: urlList,
          format,
          quality,
          width: customWidth,
          height: customHeight,
          fullPage,
          enableAutoScroll,
          delayMs,
          heroWaitMs,
          stabilizeTextures,
          removeExcessGrain,
          hideCookieBanners,
          colorScheme,
          namingPattern,
          customHeaders,
          customCookies,
        }),
      });

      if (!response.ok) {
        throw new Error(`Falha no servidor: ${response.statusText}`);
      }

      if (!response.body) {
        throw new Error('Streaming não suportado pelo navegador.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const block of lines) {
          if (!block.trim()) continue;
          const matchEvent = block.match(/event:\s*([a-zA-Z0-9_-]+)/);
          const matchData = block.match(/data:\s*(.+)/s);

          const eventName = matchEvent ? matchEvent[1] : 'message';
          const dataText = matchData ? matchData[1] : '{}';

          let payload: any = {};
          try {
            payload = JSON.parse(dataText);
          } catch {
            continue;
          }

          if (eventName === 'start') {
            setCurrentProgress({
              total: payload.total,
              current: 0,
              statusText: `Iniciando captura de ${payload.total} link(s)...`,
              step: 'running',
            });
          } else if (eventName === 'item_start') {
            setCurrentProgress((prev) => ({
              ...prev,
              current: payload.index + 1,
              statusText: `[${payload.index + 1}/${urlList.length}] Acessando ${payload.url}...`,
              step: 'navigating',
            }));
          } else if (eventName === 'item_step') {
            setCurrentProgress((prev) => ({
              ...prev,
              statusText: `[${payload.index + 1}/${urlList.length}] ${payload.status}`,
              step: payload.step,
            }));
          } else if (eventName === 'item_success') {
            const newItem: CapturedItem = {
              id: `${Date.now()}_${payload.index}`,
              index: payload.index,
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

            setCapturedItems((prev) => [newItem, ...prev]);
            setCurrentProgress((prev) => ({
              ...prev,
              current: payload.index + 1,
              statusText: `[${payload.index + 1}/${urlList.length}] Captura concluída com sucesso!`,
              step: 'item_done',
            }));
          } else if (eventName === 'item_error') {
            const errorItem: CapturedItem = {
              id: `${Date.now()}_err_${payload.index}`,
              index: payload.index,
              url: payload.url,
              fileName: payload.fileName,
              format,
              byteSize: 0,
              dimensions: { pageWidth: customWidth, pageHeight: 0 },
              durationMs: payload.durationMs || 0,
              dataUrl: '',
              error: payload.error,
              capturedAt: new Date().toLocaleTimeString('pt-BR'),
            };
            setCapturedItems((prev) => [errorItem, ...prev]);
            setCurrentProgress((prev) => ({
              ...prev,
              statusText: `[${payload.index + 1}/${urlList.length}] Falha: ${payload.error}`,
              step: 'item_error',
            }));
          } else if (eventName === 'complete') {
            setCurrentProgress((prev) => ({
              ...prev,
              statusText: 'Todos os arquivos foram finalizados com sucesso!',
              step: 'completed',
            }));
            showToast('Lote finalizado com sucesso!');
          }
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Erro de captura:', err);
        showToast(`Erro na captura: ${err.message || 'Falha de conexão'}`);
      }
    } finally {
      setIsRunning(false);
      abortControllerRef.current = null;
    }
  };

  // Download a single item
  const handleDownloadSingle = (item: CapturedItem) => {
    if (!item.dataUrl) return;
    const a = document.createElement('a');
    a.href = item.dataUrl;
    a.download = item.fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast(`Download de ${item.fileName} iniciado`);
  };

  // Copy Image to Clipboard
  const handleCopyImage = async (item: CapturedItem) => {
    const urlToCopy = item.previewDataUrl || item.dataUrl;
    if (!urlToCopy) return;
    try {
      const res = await fetch(urlToCopy);
      const blob = await res.blob();
      if (blob.type === 'image/png') {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob }),
        ]);
        showToast('Imagem PNG copiada para a área de transferência!');
      } else {
        const img = new Image();
        img.src = urlToCopy;
        await new Promise((r) => (img.onload = r));
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          canvas.toBlob(async (pngBlob) => {
            if (pngBlob) {
              await navigator.clipboard.write([
                new ClipboardItem({ 'image/png': pngBlob }),
              ]);
              showToast('Imagem copiada para a área de transferência!');
            }
          }, 'image/png');
        }
      }
    } catch {
      showToast('Cópia direta para área de transferência não suportada para este formato.');
    }
  };

  // Download All as ZIP
  const handleDownloadZipAll = async () => {
    const validItems = capturedItems.filter((item) => item.dataUrl && !item.error);
    if (validItems.length === 0) {
      showToast('Nenhum arquivo válido para baixar.');
      return;
    }

    setIsZipping(true);
    try {
      const response = await fetch('/api/screenshot/pack-zip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: validItems }),
      });

      if (!response.ok) throw new Error('Falha ao empacotar arquivo ZIP.');

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `capturas_lote_${Date.now()}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(downloadUrl);
      showToast(`Arquivo ZIP com ${validItems.length} arquivos baixado!`);
    } catch (err: any) {
      console.error(err);
      showToast('Erro ao gerar arquivo ZIP.');
    } finally {
      setIsZipping(false);
    }
  };

  const handleClearResults = () => {
    setCapturedItems([]);
    showToast('Histórico de capturas limpo.');
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  };

  return (
    <div className="min-h-screen bg-[#080c14] text-slate-100 selection:bg-amber-500/30 selection:text-amber-200">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 bg-slate-900 border border-slate-700/80 rounded shadow-2xl text-sm font-medium text-slate-200">
          <div className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
          <span>{toastMessage}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="ml-2 text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Bar Contract */}
      <header className="border-b border-slate-800/80 bg-[#090e18]/90 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Brand Wordmark */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-8 h-8 rounded bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-slate-950 font-black shadow-md">
              <Camera className="w-4 h-4 text-slate-950 stroke-[2.5]" />
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-base tracking-tight text-white flex items-center gap-2">
                CHROMIUM SNAPPER
                <span className="text-[11px] font-mono font-medium text-amber-400 bg-amber-950/60 border border-amber-800/50 px-1.5 py-0.2 rounded">
                  PRO SUITE
                </span>
              </span>
            </div>
          </div>

          {/* Zone 2: Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-semibold tracking-wide text-slate-400">
            <span className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>Chromium v156</span>
            </span>
            <span className="text-slate-700">/</span>
            <span className="text-slate-300">PDF Contínuo Vetorial</span>
            <span className="text-slate-700">/</span>
            <span className="text-slate-300">Auth & Headers Bypass</span>
            <span className="text-slate-700">/</span>
            <span className="text-slate-300">Nomenclatura Tokenizada</span>
          </nav>

          {/* Zone 3: Primary Action */}
          <div className="flex items-center gap-3 shrink-0">
            {capturedItems.length > 0 && (
              <button
                onClick={handleDownloadZipAll}
                disabled={isZipping || isRunning}
                className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white rounded transition-colors"
              >
                <FileArchive className="w-3.5 h-3.5 text-amber-400" />
                <span>Baixar ZIP ({capturedItems.filter((i) => !i.error && i.byteSize > 0).length})</span>
              </button>
            )}

            <button
              onClick={isRunning ? handleStop : handleStartCapture}
              disabled={urlList.length === 0 && !isRunning}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded transition-all shadow-sm ${
                isRunning
                  ? 'bg-rose-600 hover:bg-rose-500 text-white'
                  : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 shadow-amber-500/10'
              }`}
            >
              {isRunning ? (
                <>
                  <Square className="w-3.5 h-3.5 fill-current" />
                  <span>Interromper</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Capturar Lote ({urlList.length})</span>
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Command Engine & Parameters (40%) */}
          <div className="lg:col-span-5 space-y-6">
            {/* Input Panel */}
            <div className="bg-[#0e1422] border border-slate-800 rounded-lg p-5 shadow-xl">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-amber-400" />
                  <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
                    Lista de Links (Uma URL por linha)
                  </h2>
                </div>
                <span className="font-mono text-xs text-amber-400/90 font-medium">
                  {urlList.length} {urlList.length === 1 ? 'URL' : 'URLs'}
                </span>
              </div>

              <textarea
                value={rawUrls}
                onChange={(e) => setRawUrls(e.target.value)}
                placeholder="exemplo.com&#10;https://github.com&#10;uol.com.br"
                rows={5}
                disabled={isRunning}
                className="w-full bg-[#070b12] border border-slate-800 rounded p-3 text-sm font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-amber-500/80 focus:ring-1 focus:ring-amber-500/30 transition-all resize-y leading-relaxed"
              />

              {/* Quick Presets */}
              <div className="mt-3 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold mr-1">
                    Presets:
                  </span>
                  {QUICK_PRESETS.map((qp) => (
                    <button
                      key={qp.name}
                      onClick={() => setRawUrls(qp.urls)}
                      disabled={isRunning}
                      className="text-xs px-2 py-1 bg-slate-800/60 hover:bg-slate-700/80 text-slate-300 rounded border border-slate-700/60 transition-colors"
                    >
                      {qp.name}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setRawUrls('')}
                  disabled={isRunning || !rawUrls}
                  className="text-xs text-slate-500 hover:text-slate-300 flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Limpar</span>
                </button>
              </div>
            </div>

            {/* Precision Viewport & Format Parameters */}
            <div className="bg-[#0e1422] border border-slate-800 rounded-lg p-5 shadow-xl space-y-5">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-800/80">
                <Sliders className="w-4 h-4 text-amber-400" />
                <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
                  Parâmetros de Captura & Formatos
                </h2>
              </div>

              {/* Viewport Selectors */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Emulação de Resolução (Viewport)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {VIEWPORT_PRESETS.map((p) => {
                    const Icon = p.icon;
                    const isSelected = selectedPreset === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handlePresetChange(p.id)}
                        disabled={isRunning}
                        className={`p-2.5 rounded border text-left flex flex-col justify-between transition-all ${
                          isSelected
                            ? 'bg-amber-500/10 border-amber-500/70 text-white'
                            : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <Icon
                            className={`w-4 h-4 ${
                              isSelected ? 'text-amber-400' : 'text-slate-500'
                            }`}
                          />
                          {isSelected && (
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                          )}
                        </div>
                        <span className="text-xs font-semibold leading-tight line-clamp-1">
                          {p.name}
                        </span>
                        <span className="font-mono text-[10px] text-slate-500 tabular-nums">
                          {p.desc}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Custom Resolution Override */}
                <div className="mt-3 grid grid-cols-2 gap-3 pt-3 border-t border-slate-800/60">
                  <div>
                    <span className="text-[11px] text-slate-500 block mb-1 font-mono">
                      Largura (px)
                    </span>
                    <input
                      type="number"
                      value={customWidth}
                      onChange={(e) => {
                        setCustomWidth(Number(e.target.value));
                        setSelectedPreset('custom');
                      }}
                      min={320}
                      max={7680}
                      disabled={isRunning}
                      className="w-full bg-[#070b12] border border-slate-800 rounded px-2.5 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500 block mb-1 font-mono">
                      Altura Viewport (px)
                    </span>
                    <input
                      type="number"
                      value={customHeight}
                      onChange={(e) => {
                        setCustomHeight(Number(e.target.value));
                        setSelectedPreset('custom');
                      }}
                      min={320}
                      max={4320}
                      disabled={isRunning}
                      className="w-full bg-[#070b12] border border-slate-800 rounded px-2.5 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
              </div>

              {/* Format & Compression */}
              <div className="pt-3 border-t border-slate-800/80">
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Formato de Saída
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'webp', label: 'WebP (Recomendado)', note: 'Alta compressão & fidelidade' },
                    { id: 'pdf', label: 'PDF (Contínuo Pro)', note: 'Documento vetorial de alta precisão' },
                    { id: 'png', label: 'PNG (Lossless)', note: 'Máxima nitidez pixel a pixel' },
                    { id: 'jpg', label: 'JPG (Clássico)', note: 'Compatibilidade geral' },
                  ].map((f) => (
                    <label
                      key={f.id}
                      className={`flex items-start gap-2 p-2.5 rounded border cursor-pointer transition-colors ${
                        format === f.id
                          ? f.id === 'pdf'
                            ? 'bg-rose-500/10 border-rose-500/70'
                            : 'bg-amber-500/10 border-amber-500/70'
                          : 'bg-slate-900/40 border-slate-800/80 hover:border-slate-700'
                      }`}
                    >
                      <input
                        type="radio"
                        name="format"
                        checked={format === f.id}
                        onChange={() => setFormat(f.id as any)}
                        disabled={isRunning}
                        className="mt-0.5 accent-amber-500"
                      />
                      <div className="text-xs">
                        <span className="font-semibold text-slate-200 block flex items-center gap-1.5">
                          {f.label}
                          {f.id === 'pdf' && (
                            <FileText className="w-3 h-3 text-rose-400 inline" />
                          )}
                        </span>
                        <span className="text-[10px] text-slate-500">{f.note}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Naming Pattern Token Configurator */}
              <div className="pt-3 border-t border-slate-800/80 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-amber-400" />
                    <span>Padrão de Nomenclatura no ZIP</span>
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={namingPattern}
                    onChange={(e) => setNamingPattern(e.target.value)}
                    disabled={isRunning}
                    placeholder="[ordem]_[url]_[resolucao]"
                    className="flex-1 bg-[#070b12] border border-slate-800 rounded px-2.5 py-1.5 text-xs font-mono text-amber-300 focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* Tokens and Presets */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">Tokens:</span>
                  {['[url]', '[data]', '[hora]', '[ordem]', '[resolucao]'].map((token) => (
                    <button
                      key={token}
                      type="button"
                      onClick={() => {
                        if (!namingPattern.includes(token)) {
                          setNamingPattern((prev) => `${prev}_${token}`);
                        }
                      }}
                      disabled={isRunning}
                      className="text-[10px] font-mono px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700/60"
                      title={`Inserir ${token}`}
                    >
                      {token}
                    </button>
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">Exemplos:</span>
                  {NAMING_PRESETS.map((np) => (
                    <button
                      key={np.label}
                      type="button"
                      onClick={() => setNamingPattern(np.pattern)}
                      disabled={isRunning}
                      className="text-[10px] font-mono px-2 py-0.5 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded border border-slate-800"
                    >
                      {np.label}
                    </button>
                  ))}
                </div>

                <div className="text-[11px] font-mono text-slate-500 bg-slate-900/50 p-2 rounded border border-slate-800/80">
                  <span className="text-slate-400">Prévia: </span>
                  <span className="text-amber-400/90 font-medium">{getSampleFileName()}</span>
                </div>
              </div>

              {/* Authentication & Custom Headers Bypass (Collapsible) */}
              <div className="pt-3 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={() => setShowAuthSection((prev) => !prev)}
                  className="w-full flex items-center justify-between text-xs font-semibold text-slate-300 hover:text-white py-1"
                >
                  <div className="flex items-center gap-2">
                    <Key className="w-3.5 h-3.5 text-amber-400" />
                    <span className="uppercase tracking-wider">
                      Bypass de Autenticação, Headers & Cookies
                    </span>
                    {(customHeaders.trim() || customCookies.trim()) && (
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    )}
                  </div>
                  {showAuthSection ? (
                    <ChevronUp className="w-4 h-4 text-slate-500" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-500" />
                  )}
                </button>

                {showAuthSection && (
                  <div className="mt-3 p-3 bg-[#070b12] border border-slate-800/90 rounded space-y-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                        Headers HTTP Personalizados (ex: Authorization / Staging)
                      </label>
                      <textarea
                        value={customHeaders}
                        onChange={(e) => setCustomHeaders(e.target.value)}
                        placeholder="Authorization: Bearer seu_token_aqui&#10;X-Custom-Env: staging"
                        rows={2}
                        disabled={isRunning}
                        className="w-full bg-[#0b101c] border border-slate-800 rounded p-2 text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-amber-500"
                      />
                      <span className="text-[10px] text-slate-500 block mt-0.5">
                        1 cabeçalho por linha no formato Chave: Valor
                      </span>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                        Cookies de Sessão (Login / Consentimento Bypass)
                      </label>
                      <textarea
                        value={customCookies}
                        onChange={(e) => setCustomCookies(e.target.value)}
                        placeholder="session_id=123456789; auth_token=token_jwt_aqui"
                        rows={2}
                        disabled={isRunning}
                        className="w-full bg-[#0b101c] border border-slate-800 rounded p-2 text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-amber-500"
                      />
                      <span className="text-[10px] text-slate-500 block mt-0.5">
                        Formato padrão de cookies (nome=valor; nome2=valor2) ou array JSON
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Advanced Toggles */}
              <div className="pt-3 border-t border-slate-800/80 space-y-2.5">
                <label className="flex items-center gap-2.5 text-xs cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={fullPage}
                    onChange={(e) => setFullPage(e.target.checked)}
                    disabled={isRunning}
                    className="accent-amber-500 rounded"
                  />
                  <span className="font-semibold text-slate-300">
                    Captura Full-Page Contínua (Sem quebra de seções)
                  </span>
                </label>

                <label className="flex items-center gap-2.5 text-xs cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={enableAutoScroll}
                    onChange={(e) => setEnableAutoScroll(e.target.checked)}
                    disabled={isRunning}
                    className="accent-amber-500 rounded"
                  />
                  <div>
                    <span className="font-semibold text-slate-300 block">
                      Auto-scroll Progressivo & Hidratação de Imagens
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      Força loading=eager, decodifica atributos data-src e renderiza 100% das seções ocultas
                    </span>
                  </div>
                </label>

                <label className="flex items-center gap-2.5 text-xs cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={hideCookieBanners}
                    onChange={(e) => setHideCookieBanners(e.target.checked)}
                    disabled={isRunning}
                    className="accent-amber-500 rounded"
                  />
                  <span className="font-semibold text-slate-300">
                    Remover Banners de Consentimento / Cookies (GDPR)
                  </span>
                </label>
              </div>

              {/* Hero & Background Texture Stabilization Controls */}
              <div className="pt-3 border-t border-slate-800/80 space-y-3">
                <div className="flex items-center gap-1.5 pb-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                    Otimização de Hero & Texturas
                  </span>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-amber-400" />
                      <span>Pausa para Seção Hero & Fontes Web</span>
                    </label>
                    <span className="font-mono text-xs text-amber-400 font-bold">
                      {(heroWaitMs / 1000).toFixed(1)}s
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[
                      { label: '1.0s', val: 1000 },
                      { label: '2.0s', val: 2000, recommended: true },
                      { label: '3.5s', val: 3500 },
                      { label: '5.0s', val: 5000 },
                    ].map((btn) => (
                      <button
                        key={btn.val}
                        type="button"
                        onClick={() => setHeroWaitMs(btn.val)}
                        disabled={isRunning}
                        className={`py-1.5 px-1 text-xs font-mono rounded border transition-colors ${
                          heroWaitMs === btn.val
                            ? 'bg-amber-500/20 border-amber-500/80 text-amber-300 font-bold'
                            : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {btn.label} {btn.recommended && '★'}
                      </button>
                    ))}
                  </div>
                  <span className="text-[10px] text-slate-500 block mt-1">
                    Garante tempo para o carregamento de fontes (Google Fonts), animações, carrosséis e vídeos da hero antes de iniciar o scroll.
                  </span>
                </div>

                <label className="flex items-start gap-2.5 text-xs cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={stabilizeTextures}
                    onChange={(e) => setStabilizeTextures(e.target.checked)}
                    disabled={isRunning}
                    className="accent-amber-500 rounded mt-0.5"
                  />
                  <div>
                    <span className="font-semibold text-slate-300 block flex items-center gap-1.5">
                      <Palette className="w-3.5 h-3.5 text-amber-400 inline" />
                      <span>Estabilizar Texturas de Fundo & Parallax (Recomendado)</span>
                    </span>
                    <span className="text-[10px] text-slate-500 block leading-tight mt-0.5">
                      Desativa background-attachment: fixed e adapta camadas de ruído/textura contínuas, eliminando rasgos, distorções e repetições pixeladas.
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 text-xs cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={removeExcessGrain}
                    onChange={(e) => setRemoveExcessGrain(e.target.checked)}
                    disabled={isRunning}
                    className="accent-amber-500 rounded mt-0.5"
                  />
                  <div>
                    <span className="font-semibold text-slate-300 block">
                      Atenuar Ruído / Grain Excessivo
                    </span>
                    <span className="text-[10px] text-slate-500 block leading-tight mt-0.5">
                      Reduz a intensidade de filtros de ruído SVG ou granulação de fundo pesada que possam degradar a nitidez do arquivo final.
                    </span>
                  </div>
                </label>
              </div>

              {/* Start Button in Panel */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={isRunning ? handleStop : handleStartCapture}
                  disabled={urlList.length === 0 && !isRunning}
                  className={`w-full py-3 px-4 rounded text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
                    isRunning
                      ? 'bg-rose-600 hover:bg-rose-500 text-white'
                      : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black shadow-lg shadow-amber-500/10'
                  }`}
                >
                  {isRunning ? (
                    <>
                      <Square className="w-4 h-4 fill-current" />
                      <span>Interromper Processamento</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-current" />
                      <span>Executar Captura dos {urlList.length} Links ({format.toUpperCase()})</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Execution Live Status & Captured Gallery (60%) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Live Progress Banner when running */}
            {isRunning && (
              <div className="bg-[#101827] border border-amber-500/40 rounded-lg p-5 shadow-xl relative overflow-hidden">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-3 h-3 rounded-full bg-amber-400 animate-ping" />
                    <span className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                      Processamento Ativo ({format.toUpperCase()})
                    </span>
                  </div>
                  <span className="font-mono text-xs text-slate-300 tabular-nums">
                    {currentProgress.current} de {currentProgress.total} Concluídos
                  </span>
                </div>

                <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden mb-3">
                  <div
                    className="bg-gradient-to-r from-amber-500 to-orange-500 h-full transition-all duration-300"
                    style={{
                      width: `${
                        currentProgress.total > 0
                          ? Math.round(
                              (currentProgress.current / currentProgress.total) * 100
                            )
                          : 0
                      }%`,
                    }}
                  />
                </div>

                <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                  <span className="truncate max-w-[85%] text-slate-200">
                    {currentProgress.statusText}
                  </span>
                  <button
                    onClick={handleStop}
                    className="text-rose-400 hover:text-rose-300 font-sans font-semibold text-xs ml-2 underline"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            {/* Gallery Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <Layers className="w-4 h-4 text-amber-400" />
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                  Galeria de Capturas
                </h2>
                <span className="text-xs text-slate-500 font-mono">
                  ({capturedItems.length} {capturedItems.length === 1 ? 'item' : 'itens'})
                </span>
              </div>

              {capturedItems.length > 0 && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleDownloadZipAll}
                    disabled={isZipping || isRunning}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Baixar Tudo em .ZIP</span>
                  </button>

                  <button
                    onClick={handleClearResults}
                    className="px-2.5 py-1.5 text-xs text-slate-400 hover:text-rose-400 hover:bg-slate-800/80 rounded transition-colors"
                    title="Limpar galeria"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* Empty State */}
            {capturedItems.length === 0 && !isRunning && (
              <div className="bg-[#0e1422] border border-dashed border-slate-800 rounded-lg p-12 text-center flex flex-col items-center justify-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-600">
                  <Camera className="w-6 h-6" />
                </div>
                <div className="max-w-md">
                  <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider mb-1">
                    Nenhum arquivo capturado ainda
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Insira uma ou mais URLs, configure o padrão de nomenclatura, tokens de autenticação se necessário e clique em{' '}
                    <span className="text-amber-400 font-semibold">Capturar Lote</span>.
                  </p>
                </div>
                <button
                  onClick={handleStartCapture}
                  className="mt-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded border border-slate-700 transition-colors flex items-center gap-2"
                >
                  <Play className="w-3.5 h-3.5 text-amber-400 fill-current" />
                  <span>Testar com links padrão</span>
                </button>
              </div>
            )}

            {/* Captured Items Grid */}
            <div className="space-y-4">
              {capturedItems.map((item) => {
                const isFailed = Boolean(item.error || !item.dataUrl || item.byteSize === 0);
                return (
                  <div
                    key={item.id}
                    className={`bg-[#0e1422] border rounded-lg overflow-hidden transition-all shadow-lg ${
                      isFailed
                        ? 'border-rose-900/60 bg-rose-950/10'
                        : 'border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {isFailed ? (
                      // Error Card
                      <div className="p-4 flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-mono font-bold text-rose-300 truncate">
                              {item.url}
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono">
                              {item.capturedAt}
                            </span>
                          </div>
                          <p className="text-xs text-rose-400/90 mt-1 font-mono">
                            {item.error || 'A imagem retornou 0 bytes devido a limites de renderização da página.'}
                          </p>
                        </div>
                      </div>
                    ) : (
                      // Success Card
                      <div className="flex flex-col sm:flex-row">
                        {/* Thumbnail Preview Area */}
                        <div
                          onClick={() => {
                            setPreviewModalItem(item);
                            setZoomLevel(100);
                          }}
                          className="sm:w-48 h-48 sm:h-auto bg-[#070b12] border-b sm:border-b-0 sm:border-r border-slate-800 relative group cursor-pointer overflow-hidden flex items-start justify-center shrink-0"
                        >
                          <img
                            src={item.previewDataUrl || item.dataUrl}
                            alt={item.fileName}
                            className="w-full object-cover object-top transition-transform duration-300 group-hover:scale-105"
                            loading="lazy"
                          />
                          <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white text-xs font-semibold">
                            <Maximize2 className="w-4 h-4 text-amber-400" />
                            <span>Expandir</span>
                          </div>
                          <div className={`absolute bottom-2 left-2 backdrop-blur px-1.5 py-0.5 rounded text-[10px] font-mono border ${
                            item.format === 'pdf'
                              ? 'bg-rose-950/80 text-rose-300 border-rose-800/80 font-bold'
                              : 'bg-slate-950/80 text-slate-400 border-slate-800'
                          }`}>
                            {item.format.toUpperCase()}
                          </div>
                        </div>

                        {/* Info & Actions */}
                        <div className="p-4 flex-1 flex flex-col justify-between">
                          <div>
                            <div className="flex items-center justify-between gap-2 mb-1.5">
                              <a
                                href={item.url.startsWith('http') ? item.url : `https://${item.url}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs font-bold text-white hover:text-amber-400 transition-colors truncate max-w-sm flex items-center gap-1.5"
                              >
                                <span className="truncate">{item.url}</span>
                              </a>
                              <span className="text-[10px] text-slate-500 font-mono">
                                {item.capturedAt}
                              </span>
                            </div>

                            {/* Metadata row */}
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400 font-mono mb-2">
                              <span>
                                {item.dimensions?.pageWidth} × {item.dimensions?.pageHeight} px
                              </span>
                              <span className="text-slate-700">·</span>
                              <span>{formatBytes(item.byteSize)}</span>
                              <span className="text-slate-700">·</span>
                              <span>{(item.durationMs / 1000).toFixed(1)}s</span>
                              {item.imgStats && item.imgStats.total > 0 && (
                                <>
                                  <span className="text-slate-700">·</span>
                                  <span className="text-emerald-400 font-semibold flex items-center gap-1">
                                    <Check className="w-3 h-3 text-emerald-400" />
                                    <span>{item.imgStats.completed}/{item.imgStats.total} imagens</span>
                                  </span>
                                </>
                              )}
                            </div>

                            <div className="text-[11px] text-slate-500 font-mono truncate flex items-center gap-1.5">
                              <FileCode className="w-3.5 h-3.5 text-slate-600" />
                              <span className="text-slate-300">{item.fileName}</span>
                            </div>
                          </div>

                          {/* Card Buttons */}
                          <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-800/80">
                            <button
                              onClick={() => {
                                setPreviewModalItem(item);
                                setZoomLevel(100);
                              }}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded border border-slate-700 transition-colors"
                            >
                              <Maximize2 className="w-3.5 h-3.5 text-amber-400" />
                              <span>Ver Completo</span>
                            </button>

                            {item.format !== 'pdf' && (
                              <button
                                onClick={() => handleCopyImage(item)}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded border border-slate-700 transition-colors"
                              >
                                <Copy className="w-3.5 h-3.5" />
                                <span>Copiar</span>
                              </button>
                            )}

                            <button
                              onClick={() => handleDownloadSingle(item)}
                              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded border transition-colors ml-auto ${
                                item.format === 'pdf'
                                  ? 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border-rose-500/50'
                                  : 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border-amber-500/40'
                              }`}
                            >
                              {item.format === 'pdf' ? (
                                <FileText className="w-3.5 h-3.5 text-rose-400" />
                              ) : (
                                <Download className="w-3.5 h-3.5 text-amber-400" />
                              )}
                              <span>Download ({item.format.toUpperCase()})</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </main>

      {/* Full Page Zoom & Pan Modal */}
      {previewModalItem && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex flex-col">
          {/* Modal Header */}
          <div className="h-14 border-b border-slate-800 bg-[#0b101c] px-6 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <span className={`text-xs font-bold font-mono ${
                previewModalItem.format === 'pdf' ? 'text-rose-400' : 'text-amber-400'
              }`}>
                {previewModalItem.fileName}
              </span>
              <span className="text-slate-600">·</span>
              <span className="text-xs text-slate-400 font-mono">
                {previewModalItem.dimensions?.pageWidth} × {previewModalItem.dimensions?.pageHeight} px
              </span>
              <span className="text-slate-600">·</span>
              <span className="text-xs text-slate-400 font-mono">
                {formatBytes(previewModalItem.byteSize)}
              </span>
              {previewModalItem.format === 'pdf' && (
                <span className="text-[11px] font-mono font-bold text-rose-400 bg-rose-950/60 border border-rose-800/80 px-2 py-0.5 rounded">
                  PDF Vetorial Contínuo
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              {/* Zoom Controls */}
              <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded p-1">
                <button
                  onClick={() => setZoomLevel((z) => Math.max(25, z - 25))}
                  className="p-1 hover:text-amber-400 text-slate-400"
                  title="Diminuir Zoom"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="font-mono text-xs text-slate-200 px-2 min-w-12 text-center">
                  {zoomLevel}%
                </span>
                <button
                  onClick={() => setZoomLevel((z) => Math.min(200, z + 25))}
                  className="p-1 hover:text-amber-400 text-slate-400"
                  title="Aumentar Zoom"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setZoomLevel(100)}
                  className="text-[10px] font-mono text-slate-400 hover:text-white px-1.5"
                >
                  100%
                </button>
              </div>

              <button
                onClick={() => handleDownloadSingle(previewModalItem)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded transition-colors ${
                  previewModalItem.format === 'pdf'
                    ? 'bg-rose-600 hover:bg-rose-500 text-white'
                    : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                }`}
              >
                {previewModalItem.format === 'pdf' ? (
                  <FileText className="w-3.5 h-3.5" />
                ) : (
                  <Download className="w-3.5 h-3.5" />
                )}
                <span>Baixar {previewModalItem.format.toUpperCase()}</span>
              </button>

              <button
                onClick={() => setPreviewModalItem(null)}
                className="p-2 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Modal Body: Scrollable Image Viewport */}
          <div className="flex-1 overflow-auto p-8 flex items-start justify-center bg-[#070b12]">
            <div
              style={{ width: `${zoomLevel}%` }}
              className="max-w-6xl transition-all duration-150 shadow-2xl border border-slate-800 bg-[#0e1422] rounded overflow-hidden"
            >
              <img
                src={previewModalItem.previewDataUrl || previewModalItem.dataUrl}
                alt={previewModalItem.fileName}
                className="w-full h-auto block"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
