/**
 * Tipos e utilitários compartilhados entre cliente e servidor para o
 * "Relatório Dev": configuração da IA, renderização de Markdown, nomes de
 * arquivo e montagem do documento para PDF.
 *
 * Este módulo é puro (sem DOM e sem APIs de Node) para poder ser importado
 * tanto pelo Vite quanto pelo servidor Express via tsx.
 */

export type AiDepth = 'fast' | 'balanced' | 'max';

export interface AiSettings {
  /** Chave salva apenas no navegador. Vazia = usar a chave do servidor. */
  apiKey: string;
  baseUrl: string;
  model: string;
  depth: AiDepth;
  /** Permite usar DEEPSEEK_API_KEY definida no ambiente do servidor. */
  useServerKey: boolean;
  /** Anexa uma captura de tela da página ao prompt (modelos com visão). */
  includeImage: boolean;
}

export const DEFAULT_AI_BASE_URL = 'https://api.deepseek.com';
export const DEFAULT_AI_MODEL = 'deepseek-flash';

export const DEFAULT_AI_SETTINGS: AiSettings = {
  apiKey: '',
  baseUrl: DEFAULT_AI_BASE_URL,
  model: DEFAULT_AI_MODEL,
  depth: 'balanced',
  useServerKey: true,
  includeImage: true,
};

export interface AiModelOption {
  id: string;
  label: string;
  note: string;
  vision: boolean;
}

export const AI_MODEL_OPTIONS: AiModelOption[] = [
  {
    id: 'deepseek-flash',
    label: 'deepseek-flash',
    note: 'V4.1 Flash — rápido, multimodal, enxerga a captura.',
    vision: true,
  },
  {
    id: 'deepseek-v4-pro',
    label: 'deepseek-v4-pro',
    note: 'Raciocínio profundo — análise mais densa, somente texto.',
    vision: false,
  },
];

export const AI_DEPTH_OPTIONS: Array<{
  id: AiDepth;
  label: string;
  note: string;
}> = [
  {
    id: 'fast',
    label: 'Rápida',
    note: 'Sem raciocínio estendido · respostas em menos tempo.',
  },
  {
    id: 'balanced',
    label: 'Equilibrada',
    note: 'Raciocínio alto e relatório completo. Recomendado.',
  },
  {
    id: 'max',
    label: 'Máxima',
    note: 'Esforço máximo e orçamento maior. Mais lenta e mais cara.',
  },
];

export const AI_DEPTH_PARAMS: Record<
  AiDepth,
  { thinking: 'enabled' | 'disabled'; reasoningEffort?: 'high' | 'max'; maxTokens: number }
> = {
  fast: { thinking: 'disabled', maxTokens: 8192 },
  balanced: { thinking: 'enabled', reasoningEffort: 'high', maxTokens: 20000 },
  max: { thinking: 'enabled', reasoningEffort: 'max', maxTokens: 32768 },
};

export interface AiModelInfo {
  id: string;
  ownedBy?: string;
}

export interface AiStatusResponse {
  hasServerKey: boolean;
  defaultBaseUrl: string;
  defaultModel: string;
  models: AiModelInfo[];
}

export interface AiTestResult {
  ok: boolean;
  latencyMs: number;
  models: AiModelInfo[];
  modelAvailable: boolean;
  balance?: string;
}

export interface DevReportUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

/** Dados técnicos resumidos exibidos e persistidos com o relatório. */
export interface DevReportTechnical {
  title: string;
  palette: string[];
  fonts: string[];
  sections: number;
  nodes: number;
  images: number;
  stylesheets: number;
  scripts: number;
  breakpoints: string[];
  imageAttached: boolean;
  finalUrl?: string;
  statusCode?: number;
}

export interface DevReportRecord {
  id: string;
  url: string;
  title: string;
  model: string;
  markdown: string;
  createdAt: string;
  durationMs?: number;
  usage?: DevReportUsage;
  technical?: DevReportTechnical;
}

export interface DevReportMetaEvent {
  title: string;
  url: string;
  finalUrl: string;
  statusCode?: number;
  model: string;
  palette: string[];
  fonts: string[];
  sections: number;
  nodes: number;
  images: number;
  stylesheets: number;
  scripts: number;
  breakpoints: string[];
  imageAttached: boolean;
  dossier: unknown;
  dossierChars?: number;
  depth?: string;
  imageCount?: number;
}

export type DevReportStageId =
  | 'connecting'
  | 'navigating'
  | 'extracting'
  | 'analyzing'
  | 'generating'
  | 'finalizing'
  | 'done';

export interface DevReportStageEvent {
  stage: DevReportStageId;
  message: string;
}

export function normalizeBaseUrl(value: string): string {
  const trimmed = (value || '').trim();
  if (!trimmed) return DEFAULT_AI_BASE_URL;
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  return withProtocol.replace(/\/+$/, '');
}

export function supportsVision(model: string): boolean {
  return /flash|vision|vl|multimodal/i.test(model || '');
}

export function isAiConfigured(
  settings: AiSettings,
  serverKeyAvailable: boolean
): boolean {
  if (settings.apiKey.trim().length > 0) return true;
  return settings.useServerKey && serverKeyAvailable;
}

export function maskApiKey(key: string): string {
  const trimmed = key.trim();
  if (!trimmed) return '';
  if (trimmed.length <= 8) return '••••••••';
  return `${trimmed.slice(0, 4)}••••${trimmed.slice(-4)}`;
}

export function aiDepthLabel(depth: AiDepth): string {
  return AI_DEPTH_OPTIONS.find((option) => option.id === depth)?.label ?? depth;
}

/* ------------------------------- Markdown -------------------------------- */

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function safeHref(raw: string): string {
  const value = raw.trim();
  if (/^(https?:\/\/|mailto:|tel:|#|\/)/i.test(value)) return value;
  return '';
}

function renderInline(raw: string): string {
  let text = escapeHtml(raw);
  // Links [texto](url) — processados antes de bold/italic para não capturar
  // asteriscos dentro da URL.
  text = text.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (match, label: string, href: string) => {
    const safe = safeHref(href.replace(/&amp;/g, '&'));
    if (!safe) return label;
    const external = /^https?:\/\//i.test(safe);
    return `<a href="${escapeHtml(safe)}"${external ? ' target="_blank" rel="noreferrer"' : ''}>${label}</a>`;
  });
  text = text.replace(/`([^`]+)`/g, '<code>$1</code>');
  text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  text = text.replace(/__([^_]+)__/g, '<strong>$1</strong>');
  text = text.replace(/(^|[\s(])\*([^*\n]+)\*(?=[\s).,;:!?]|$)/g, '$1<em>$2</em>');
  text = text.replace(/(^|[\s(])_([^_\n]+)_(?=[\s).,;:!?]|$)/g, '$1<em>$2</em>');
  text = text.replace(/~~([^~]+)~~/g, '<del>$1</del>');
  return text;
}

function splitTableRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim());
}

function slugifyHeading(raw: string, used: Set<string>): string {
  const base =
    raw
      .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
      .replace(/[*_`~]/g, '')
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'secao';
  let candidate = base;
  let suffix = 2;
  while (used.has(candidate)) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
  used.add(candidate);
  return candidate;
}

export function extractMarkdownHeadings(
  markdown: string
): Array<{ id: string; title: string; level: number }> {
  const used = new Set<string>();
  const headings: Array<{ id: string; title: string; level: number }> = [];
  let inFence = false;
  for (const line of (markdown || '').replace(/\r\n/g, '\n').split('\n')) {
    if (line.trim().startsWith('```')) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    const match = line.trim().match(/^(#{1,3})\s+(.+)$/);
    if (!match) continue;
    const id = slugifyHeading(match[2], used);
    headings.push({
      id,
      title: match[2].replace(/[*_`~]/g, '').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1'),
      level: match[1].length,
    });
  }
  return headings;
}

/**
 * Renderizador Markdown pragmático para relatórios de IA. O conteúdo é
 * escapado antes de qualquer tag ser emitida, então a saída é segura para
 * `dangerouslySetInnerHTML` e para a página de impressão do PDF.
 */
export function renderMarkdownToHtml(markdown: string): string {
  const source = (markdown || '').replace(/\r\n/g, '\n');
  const codeBlocks: string[] = [];
  const withoutCode = source.replace(/```([\w-]*)\n([\s\S]*?)```/g, (_match, lang: string, code: string) => {
    const language = lang ? ` data-language="${escapeHtml(lang)}"` : '';
    const languageLabel = lang ? `<span class="code-lang">${escapeHtml(lang)}</span>` : '';
    codeBlocks.push(
      `<pre class="code-block"${language}>${languageLabel}<code>${escapeHtml(
        code.replace(/\n$/, '')
      )}</code></pre>`
    );
    return `\u0000CODEBLOCK${codeBlocks.length - 1}\u0000`;
  });

  const lines = withoutCode.split('\n');
  const html: string[] = [];
  const headingIds = new Set<string>();
  let index = 0;
  let listType: 'ul' | 'ol' | null = null;
  let paragraph: string[] = [];

  const closeParagraph = () => {
    if (paragraph.length === 0) return;
    html.push(`<p>${renderInline(paragraph.join(' '))}</p>`);
    paragraph = [];
  };

  const closeList = () => {
    if (!listType) return;
    html.push(`</${listType}>`);
    listType = null;
  };

  const openList = (type: 'ul' | 'ol') => {
    if (listType === type) return;
    closeList();
    html.push(`<${type}>`);
    listType = type;
  };

  while (index < lines.length) {
    const line = lines[index];
    const trimmed = line.trim();

    if (!trimmed) {
      closeParagraph();
      closeList();
      index += 1;
      continue;
    }

    const codePlaceholder = trimmed.match(/^\u0000CODEBLOCK(\d+)\u0000$/);
    if (codePlaceholder) {
      closeParagraph();
      closeList();
      html.push(codeBlocks[Number(codePlaceholder[1])] ?? '');
      index += 1;
      continue;
    }

    const fence = trimmed.match(/^```/);
    if (fence) {
      // Bloco não fechado: consome até o fim e renderiza como código.
      const codeLines: string[] = [];
      index += 1;
      while (index < lines.length && !lines[index].trim().startsWith('```')) {
        codeLines.push(lines[index]);
        index += 1;
      }
      index += 1;
      closeParagraph();
      closeList();
      html.push(`<pre class="code-block"><code>${escapeHtml(codeLines.join('\n'))}</code></pre>`);
      continue;
    }

    const heading = trimmed.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      closeParagraph();
      closeList();
      const level = heading[1].length;
      const id = slugifyHeading(heading[2], headingIds);
      html.push(`<h${level} id="${id}">${renderInline(heading[2])}</h${level}>`);
      index += 1;
      continue;
    }

    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      closeParagraph();
      closeList();
      html.push('<hr />');
      index += 1;
      continue;
    }

    if (trimmed.startsWith('>')) {
      closeParagraph();
      closeList();
      const quote: string[] = [];
      while (index < lines.length && lines[index].trim().startsWith('>')) {
        quote.push(lines[index].trim().replace(/^>\s?/, ''));
        index += 1;
      }
      html.push(`<blockquote>${renderInline(quote.join(' '))}</blockquote>`);
      continue;
    }

    // Tabelas: linha com pipes seguida de separador |---|:--:|
    if (trimmed.includes('|') && index + 1 < lines.length) {
      const separator = lines[index + 1].trim();
      if (/^\|?[\s:|-]+\|[\s:|-]*$/.test(separator) && separator.includes('-')) {
        closeParagraph();
        closeList();
        const header = splitTableRow(trimmed);
        const alignments = splitTableRow(separator).map((cell) => {
          const left = cell.startsWith(':');
          const right = cell.endsWith(':');
          if (left && right) return 'center';
          if (right) return 'right';
          if (left) return 'left';
          return '';
        });
        const rows: string[][] = [];
        index += 2;
        while (index < lines.length && lines[index].trim().includes('|')) {
          rows.push(splitTableRow(lines[index]));
          index += 1;
        }
        const headCells = header
          .map(
            (cell, cellIndex) =>
              `<th${alignments[cellIndex] ? ` style="text-align:${alignments[cellIndex]}"` : ''}>${renderInline(
                cell
              )}</th>`
          )
          .join('');
        const bodyRows = rows
          .map(
            (row) =>
              `<tr>${row
                .map(
                  (cell, cellIndex) =>
                    `<td${alignments[cellIndex] ? ` style="text-align:${alignments[cellIndex]}"` : ''}>${renderInline(
                      cell
                    )}</td>`
                )
                .join('')}</tr>`
          )
          .join('');
        html.push(
          `<div class="table-wrap"><table><thead><tr>${headCells}</tr></thead><tbody>${bodyRows}</tbody></table></div>`
        );
        continue;
      }
    }

    const unordered = trimmed.match(/^[-*+]\s+(.*)$/);
    const ordered = trimmed.match(/^\d+[.)]\s+(.*)$/);
    if (unordered || ordered) {
      closeParagraph();
      openList(unordered ? 'ul' : 'ol');
      const itemContent = (unordered ?? ordered)![1];
      const task = itemContent.match(/^\[( |x|X)\]\s+(.*)$/);
      if (task) {
        const done = task[1].toLowerCase() === 'x';
        html.push(
          `<li class="task-item"><span class="task-box${done ? ' task-box-done' : ''}" aria-hidden="true">${
            done ? '✓' : ''
          }</span>${renderInline(task[2])}</li>`
        );
      } else {
        html.push(`<li>${renderInline(itemContent)}</li>`);
      }
      index += 1;
      continue;
    }

    // Linha de continuação de item de lista (indentada).
    if (listType && /^\s{2,}\S/.test(line)) {
      const lastIndex = html.length - 1;
      if (lastIndex >= 0 && html[lastIndex].startsWith('<li>')) {
        html[lastIndex] = html[lastIndex].replace(/<\/li>$/, ` ${renderInline(trimmed)}</li>`);
        index += 1;
        continue;
      }
    }

    closeList();
    paragraph.push(trimmed);
    index += 1;
  }

  closeParagraph();
  closeList();
  return html.join('\n');
}

/* ------------------------------ Exportação -------------------------------- */

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

export function reportTimestampSlug(date = new Date()): string {
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(
    date.getHours()
  )}${pad(date.getMinutes())}`;
}

export function reportHost(url: string): string {
  try {
    return new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`).host.replace(/^www\./, '');
  } catch {
    return url.replace(/^https?:\/\//i, '').split('/')[0] || 'relatorio';
  }
}

export function buildDevReportFileName(
  record: Pick<DevReportRecord, 'url' | 'createdAt'>,
  extension: 'txt' | 'pdf' | 'json' | 'md'
): string {
  const host = reportHost(record.url)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  const date = new Date(record.createdAt);
  const stamp = Number.isNaN(date.getTime()) ? reportTimestampSlug() : reportTimestampSlug(date);
  return `relatorio-dev_${host || 'pagina'}_${stamp}.${extension}`;
}

function yamlString(value: string): string {
  return `"${(value || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\r?\n/g, ' ')}"`;
}

/** Documento Markdown pronto para versionamento, com frontmatter e anexo opcional. */
export function formatReportAsMarkdown(
  record: DevReportRecord,
  appendixMarkdown?: string
): string {
  const frontmatter = [
    '---',
    `title: ${yamlString(record.title || reportHost(record.url))}`,
    `url: ${yamlString(record.url)}`,
    `model: ${yamlString(record.model)}`,
    `createdAt: ${yamlString(record.createdAt)}`,
    record.usage ? `tokens: ${record.usage.totalTokens}` : '',
    '---',
  ].filter(Boolean);

  const body = record.markdown.trim();
  const withTitle = /^#\s+/.test(body)
    ? body
    : `# ${record.title || reportHost(record.url)}\n\n${body}`;
  const appendix =
    appendixMarkdown && appendixMarkdown.trim()
      ? `\n\n---\n\n## Anexo técnico\n\n${appendixMarkdown.trim()}`
      : '';

  return `${frontmatter.join('\n')}\n\n${withTitle}${appendix}\n`;
}

export function formatReportAsText(
  record: DevReportRecord,
  appendixMarkdown?: string
): string {
  const headerLines = [
    'RELATÓRIO DEV — ENGENHARIA REVERSA DE INTERFACE',
    '='.repeat(58),
    `Título: ${record.title || reportHost(record.url)}`,
    `URL: ${record.url}`,
    `Modelo: ${record.model}`,
    `Gerado em: ${new Date(record.createdAt).toLocaleString('pt-BR')}`,
  ];
  if (record.usage) {
    headerLines.push(
      `Tokens: ${record.usage.totalTokens} (${record.usage.promptTokens} entrada / ${record.usage.completionTokens} saída)`
    );
  }
  if (record.technical?.palette?.length) {
    headerLines.push(`Paleta: ${record.technical.palette.slice(0, 10).join(' · ')}`);
  }
  if (record.technical?.fonts?.length) {
    headerLines.push(`Fontes: ${record.technical.fonts.slice(0, 8).join(' · ')}`);
  }
  headerLines.push('='.repeat(58));

  const appendix =
    appendixMarkdown && appendixMarkdown.trim()
      ? `\n\n${'='.repeat(58)}\nANEXO TÉCNICO\n${'='.repeat(58)}\n\n${appendixMarkdown.trim()}`
      : '';

  return `${headerLines.join('\n')}\n\n${record.markdown.trim()}${appendix}\n`;
}

const PRINT_STYLES = `
  @page { size: A4; }
  * { box-sizing: border-box; }
  html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body {
    margin: 0;
    color: #18202c;
    font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
    font-size: 10.5pt;
    line-height: 1.58;
  }
  .cover {
    border-bottom: 2px solid #e7a11d;
    padding-bottom: 16px;
    margin-bottom: 22px;
  }
  .cover .eyebrow {
    display: inline-block;
    font-size: 8pt;
    font-weight: 700;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: #9a6410;
    background: #fdf3df;
    border: 1px solid #f0d6a4;
    border-radius: 999px;
    padding: 4px 9px;
    margin-bottom: 10px;
  }
  .cover h1 {
    margin: 0 0 6px;
    font-size: 24pt;
    line-height: 1.15;
    letter-spacing: -0.02em;
    color: #0d1420;
  }
  .cover .url {
    margin: 0 0 12px;
    font-family: "SFMono-Regular", Menlo, Consolas, monospace;
    font-size: 8.5pt;
    color: #4c5a6c;
    word-break: break-all;
  }
  .cover .meta {
    display: flex;
    flex-wrap: wrap;
    gap: 8px 18px;
    font-size: 8.5pt;
    color: #5b6879;
  }
  .cover .meta strong { color: #23303f; font-weight: 600; }
  .palette { display: flex; gap: 5px; margin-top: 12px; }
  .swatch {
    width: 26px; height: 18px; border-radius: 4px;
    border: 1px solid rgba(0,0,0,0.14);
    display: inline-block;
  }
  h1, h2, h3, h4, h5, h6 {
    color: #101a27;
    line-height: 1.28;
    page-break-after: avoid;
    break-after: avoid;
  }
  h1 { font-size: 19pt; margin: 26px 0 10px; border-bottom: 1px solid #e5e9ef; padding-bottom: 6px; }
  h2 { font-size: 15.5pt; margin: 24px 0 9px; }
  h3 { font-size: 12.5pt; margin: 20px 0 7px; }
  h4 { font-size: 11pt; margin: 16px 0 6px; text-transform: uppercase; letter-spacing: 0.06em; color: #48566a; }
  h5, h6 { font-size: 10.5pt; margin: 14px 0 5px; }
  p { margin: 0 0 9px; orphans: 3; widows: 3; }
  ul, ol { margin: 0 0 10px; padding-left: 20px; }
  li { margin: 0 0 3px; }
  li.task-item { display: flex; align-items: flex-start; gap: 6px; list-style: none; margin-left: -14px; }
  .task-box {
    display: inline-flex; flex-shrink: 0; align-items: center; justify-content: center;
    width: 11px; height: 11px; margin-top: 2px;
    border: 1px solid #a9b5c5; border-radius: 3px;
    font-size: 7.5px; line-height: 1; color: #10202f; background: #fff;
  }
  .task-box-done { border-color: #10b981; background: #10b981; }
  strong { color: #0f1724; }
  a { color: #a56208; text-decoration: none; border-bottom: 0.5px solid #ddbf8e; }
  code {
    font-family: "SFMono-Regular", Menlo, Consolas, monospace;
    font-size: 8.8pt;
    background: #f3f5f8;
    border: 1px solid #e2e7ee;
    border-radius: 3px;
    padding: 0.5px 4px;
    color: #7a3e00;
  }
  pre.code-block {
    position: relative;
    background: #0f1724;
    color: #e6edf6;
    border-radius: 7px;
    padding: 13px 15px;
    font-size: 8.6pt;
    line-height: 1.5;
    white-space: pre-wrap;
    word-break: break-word;
    page-break-inside: avoid;
    break-inside: avoid;
    margin: 0 0 12px;
    border: 1px solid #1e2b3d;
  }
  pre.code-block code {
    background: transparent; border: 0; padding: 0; color: inherit; font-size: inherit;
  }
  .code-lang {
    display: block;
    font-size: 7.2pt;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: #7f93ab;
    margin-bottom: 7px;
  }
  .table-wrap { margin: 0 0 12px; page-break-inside: avoid; }
  table { width: 100%; border-collapse: collapse; font-size: 8.8pt; }
  th, td { border: 1px solid #dfe5ec; padding: 6px 8px; text-align: left; vertical-align: top; }
  th { background: #f4f6f9; color: #253243; font-weight: 700; }
  tr:nth-child(even) td { background: #fafbfc; }
  blockquote {
    margin: 0 0 12px;
    padding: 8px 13px;
    border-left: 3px solid #e7a11d;
    background: #fdf8ee;
    color: #4b3a1d;
    page-break-inside: avoid;
  }
  hr { border: 0; border-top: 1px solid #e2e7ee; margin: 20px 0; }
  .footer {
    margin-top: 26px; padding-top: 10px; border-top: 1px solid #e2e7ee;
    font-size: 7.6pt; color: #8b97a7;
  }
`;

export function renderDevReportPrintHtml(
  record: DevReportRecord,
  appendixMarkdown?: string
): string {
  const created = new Date(record.createdAt);
  const createdLabel = Number.isNaN(created.getTime())
    ? record.createdAt
    : created.toLocaleString('pt-BR');
  const swatches = (record.technical?.palette ?? [])
    .slice(0, 12)
    .map((color) => `<span class="swatch" style="background:${escapeHtml(color)}"></span>`)
    .join('');
  // O título já aparece na capa; remove o H1 inicial do corpo para não
  // duplicar o cabeçalho no PDF.
  const bodyMarkdown = record.markdown.replace(/^\s*#\s+[^\n]*\n+/, '');
  const body = renderMarkdownToHtml(bodyMarkdown);
  const appendix =
    appendixMarkdown && appendixMarkdown.trim()
      ? `<section><h1>Anexo técnico</h1>${renderMarkdownToHtml(appendixMarkdown)}</section>`
      : '';

  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(record.title || 'Relatório Dev')}</title>
<style>${PRINT_STYLES}</style>
</head>
<body>
  <header class="cover">
    <span class="eyebrow">Relatório Dev · DeepSeek</span>
    <h1>${escapeHtml(record.title || reportHost(record.url))}</h1>
    <p class="url">${escapeHtml(record.url)}</p>
    <div class="meta">
      <span><strong>Gerado em</strong> ${escapeHtml(createdLabel)}</span>
      <span><strong>Modelo</strong> ${escapeHtml(record.model)}</span>
      ${record.usage ? `<span><strong>Tokens</strong> ${record.usage.totalTokens}</span>` : ''}
      ${record.technical?.sections ? `<span><strong>Seções mapeadas</strong> ${record.technical.sections}</span>` : ''}
    </div>
    ${swatches ? `<div class="palette">${swatches}</div>` : ''}
  </header>
  <main>${body}</main>
  ${appendix}
  <footer class="footer">
    Documento gerado pelo Chromium Snapper com apoio da API DeepSeek. As informações
    descrevem a página observada no momento da captura e podem variar com o tempo.
  </footer>
</body>
</html>`;
}

export function buildTechnicalAppendix(dossier: unknown): string {
  if (!dossier) return '';
  let json = '';
  try {
    json = JSON.stringify(dossier, null, 2);
  } catch {
    return '';
  }
  if (json.length > 120_000) {
    json = `${json.slice(0, 120_000)}\n… (truncado)`;
  }
  return [
    'Dados brutos extraídos do DOM, CSSOM e performance da página no momento da captura.',
    '',
    '```json',
    json,
    '```',
  ].join('\n');
}
