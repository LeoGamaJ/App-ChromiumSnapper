import type { LucideIcon } from 'lucide-react';
import {
  Camera,
  Code2,
  FileImage,
  FileText,
  Image as ImageIcon,
  Laptop,
  Monitor,
  Newspaper,
  Palette,
  Smartphone,
  Tablet,
} from 'lucide-react';

export type OutputFormat = 'webp' | 'png' | 'jpg' | 'pdf';
export type ColorScheme = 'no-preference' | 'light' | 'dark';

export const MAX_URLS = 50;
export const MIN_WIDTH = 320;
export const MAX_WIDTH = 7680;
export const MIN_HEIGHT = 320;
export const MAX_HEIGHT = 4320;

export interface RunProgress {
  total: number;
  finished: number;
  statusText: string;
  step: string;
}

export interface LastRun {
  total: number;
  success: number;
  failed: number;
  durationMs: number;
  interrupted: boolean;
}

export interface CapturedItem {
  id: string;
  index: number;
  url: string;
  fileName: string;
  format: OutputFormat;
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

export interface ViewportPreset {
  id: string;
  name: string;
  shortName: string;
  icon: LucideIcon;
  width: number;
  height: number;
  desc: string;
}

export const VIEWPORT_PRESETS: ViewportPreset[] = [
  {
    id: 'desktop-fhd',
    name: 'Desktop Full HD',
    shortName: 'Full HD',
    icon: Monitor,
    width: 1920,
    height: 1080,
    desc: '1920 × 1080',
  },
  {
    id: 'desktop-4k',
    name: 'Desktop 4K',
    shortName: '4K',
    icon: Monitor,
    width: 3840,
    height: 2160,
    desc: '3840 × 2160',
  },
  {
    id: 'laptop',
    name: 'Laptop Pro',
    shortName: 'Laptop',
    icon: Laptop,
    width: 1440,
    height: 900,
    desc: '1440 × 900',
  },
  {
    id: 'tablet',
    name: 'Tablet iPad',
    shortName: 'Tablet',
    icon: Tablet,
    width: 768,
    height: 1024,
    desc: '768 × 1024',
  },
  {
    id: 'mobile',
    name: 'Mobile iPhone',
    shortName: 'Mobile',
    icon: Smartphone,
    width: 390,
    height: 844,
    desc: '390 × 844',
  },
];

export interface FormatOption {
  id: OutputFormat;
  label: string;
  note: string;
  icon: LucideIcon;
  badge?: 'Recomendado' | 'PRO';
  tone: 'amber' | 'rose' | 'emerald' | 'slate';
}

export const FORMAT_OPTIONS: FormatOption[] = [
  {
    id: 'webp',
    label: 'WebP',
    note: 'Compressão inteligente com alta fidelidade.',
    icon: ImageIcon,
    badge: 'Recomendado',
    tone: 'amber',
  },
  {
    id: 'pdf',
    label: 'PDF',
    note: 'Documento vetorial contínuo de alta precisão.',
    icon: FileText,
    badge: 'PRO',
    tone: 'rose',
  },
  {
    id: 'png',
    label: 'PNG',
    note: 'Sem perdas, nitidez pixel a pixel.',
    icon: FileImage,
    tone: 'emerald',
  },
  {
    id: 'jpg',
    label: 'JPG',
    note: 'Compatibilidade universal, arquivos leves.',
    icon: Camera,
    tone: 'slate',
  },
];

export interface QuickPreset {
  name: string;
  urls: string;
  icon: LucideIcon;
  hint: string;
}

export const QUICK_PRESETS: QuickPreset[] = [
  {
    name: 'Tech & Dev',
    hint: 'GitHub, Hacker News e Stack Overflow',
    icon: Code2,
    urls: 'github.com\nnews.ycombinator.com\nstackoverflow.com',
  },
  {
    name: 'Notícias',
    hint: 'UOL, G1 e CNN Brasil',
    icon: Newspaper,
    urls: 'uol.com.br\ng1.globo.com\ncnnbrasil.com.br',
  },
  {
    name: 'Portfólio',
    hint: 'Sites de design e produto',
    icon: Palette,
    urls: 'leogama.com\nbijoutech.netlify.app\napple.com',
  },
];

export const DEFAULT_URLS = 'leogama.com\nbijoutech.netlify.app\nuol.com.br';

export const NAMING_TOKENS = ['[url]', '[data]', '[hora]', '[ordem]', '[resolucao]', '[formato]'];

export const NAMING_PRESETS = [
  '[ordem]_[url]_[resolucao]',
  '[data]_[url]_[resolucao]',
  '[ordem]_[url]',
  '[data]_[ordem]_[url]',
];

export interface CaptureSettings {
  format: OutputFormat;
  quality: number;
  presetId: string;
  width: number;
  height: number;
  fullPage: boolean;
  autoScroll: boolean;
  hideCookieBanners: boolean;
  delayMs: number;
  heroWaitMs: number;
  stabilizeTextures: boolean;
  removeExcessGrain: boolean;
  colorScheme: ColorScheme;
  namingPattern: string;
  customHeaders: string;
  customCookies: string;
}

export const DEFAULT_SETTINGS: CaptureSettings = {
  format: 'webp',
  quality: 85,
  presetId: 'desktop-fhd',
  width: 1920,
  height: 1080,
  fullPage: true,
  autoScroll: true,
  hideCookieBanners: true,
  delayMs: 1200,
  heroWaitMs: 2000,
  stabilizeTextures: true,
  removeExcessGrain: false,
  colorScheme: 'no-preference',
  namingPattern: '[ordem]_[url]_[resolucao]',
  customHeaders: '',
  customCookies: '',
};

export function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

export function parseUrls(raw: string): string[] {
  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

export function dedupeUrls(urls: string[]): string[] {
  const seen = new Set<string>();
  return urls.filter((url) => {
    const key = url
      .toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/\/+$/, '');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function countDuplicates(urls: string[]): number {
  return urls.length - dedupeUrls(urls).length;
}

export function hrefOf(url: string): string {
  const trimmed = url.trim();
  if (/^(https?:|data:|file:)/i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export function hostOf(url: string): string {
  try {
    return new URL(hrefOf(url)).host.replace(/^www\./, '');
  } catch {
    return url.replace(/^https?:\/\//i, '').split('/')[0] || url;
  }
}

export function pathOf(url: string): string {
  try {
    const parsed = new URL(hrefOf(url));
    const path = `${parsed.pathname}${parsed.search}`.replace(/\/$/, '');
    return path === '' ? '' : path;
  } catch {
    return '';
  }
}

export function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  const value = bytes / Math.pow(1024, index);
  return `${value.toFixed(index === 0 ? 0 : value >= 100 ? 0 : 1)} ${units[index]}`;
}

export function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return '0s';
  if (ms < 1000) return `${Math.round(ms)}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(ms < 10_000 ? 1 : 0)}s`;
  const minutes = Math.floor(ms / 60_000);
  const seconds = Math.round((ms % 60_000) / 1000);
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export function formatClock(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function previewFileName(settings: CaptureSettings): string {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '-');
  const resolution = `${settings.width}x${settings.height}`;

  const pattern = settings.namingPattern.trim() || '[ordem]_[url]_[resolucao]';
  let result = pattern
    .replace(/\[url\]/gi, 'exemplo_site')
    .replace(/\[data\]/gi, dateStr)
    .replace(/\[hora\]/gi, timeStr)
    .replace(/\[ordem\]/gi, '01')
    .replace(/\[resolucao\]/gi, resolution)
    .replace(/\[formato\]/gi, settings.format);

  result = result.replace(/[^a-z0-9_\-.]/gi, '_').replace(/_+/g, '_').toLowerCase();
  if (!result.endsWith(`.${settings.format}`)) {
    result = `${result}.${settings.format}`;
  }
  return result;
}

export function timestampSlug(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    '-',
    pad(date.getHours()),
    pad(date.getMinutes()),
  ].join('');
}

export const STEP_LABELS: Record<string, string> = {
  idle: 'Aguardando',
  init: 'Preparando',
  running: 'Na fila',
  loading: 'Carregando',
  hydrating: 'Hidratando DOM',
  hero_settling: 'Fontes & hero',
  texture_stabilizing: 'Texturas',
  scrolling: 'Scroll progressivo',
  decoding: 'Imagens',
  settling: 'Estabilizando',
  capturing: 'Capturando',
  item_done: 'Concluído',
  completed: 'Finalizado',
  stopped: 'Interrompido',
  item_error: 'Falha',
};

export function stepLabel(step: string): string {
  return STEP_LABELS[step] ?? 'Processando';
}
