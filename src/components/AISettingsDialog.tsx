import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  EyeOff,
  ExternalLink,
  Gauge,
  Image as ImageIcon,
  KeyRound,
  RotateCcw,
  Save,
  Server,
  Sparkles,
  X,
} from 'lucide-react';
import {
  AI_DEPTH_OPTIONS,
  AI_MODEL_OPTIONS,
  DEFAULT_AI_BASE_URL,
  DEFAULT_AI_MODEL,
  DEFAULT_AI_SETTINGS,
  normalizeBaseUrl,
  supportsVision,
  type AiSettings,
  type AiStatusResponse,
  type AiTestResult,
} from '../lib/devReport';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { cn, Spinner, Switch } from './ui';

interface AISettingsDialogProps {
  settings: AiSettings;
  serverStatus: AiStatusResponse | null;
  onSave: (settings: AiSettings) => void;
  onClose: () => void;
  onNotify: (message: string, kind?: 'success' | 'error' | 'info') => void;
}

type TestState =
  | { status: 'idle' }
  | { status: 'testing' }
  | { status: 'success'; result: AiTestResult }
  | { status: 'error'; message: string };

export function AISettingsDialog({
  settings,
  serverStatus,
  onSave,
  onClose,
  onNotify,
}: AISettingsDialogProps) {
  const [draft, setDraft] = useState<AiSettings>(settings);
  const [showKey, setShowKey] = useState(false);
  const [test, setTest] = useState<TestState>({ status: 'idle' });
  const dialogRef = useRef<HTMLDivElement>(null);
  const keyInputRef = useRef<HTMLInputElement>(null);

  useFocusTrap(dialogRef);

  const hasServerKey = Boolean(serverStatus?.hasServerKey);
  const vision = supportsVision(draft.model);
  const hasAnyKey = Boolean(draft.apiKey.trim()) || (draft.useServerKey && hasServerKey);

  const patch = (values: Partial<AiSettings>) => {
    setDraft((previous) => ({ ...previous, ...values }));
    setTest({ status: 'idle' });
  };

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    keyInputRef.current?.focus();
  }, []);

  const serverModelNote = useMemo(
    () =>
      AI_MODEL_OPTIONS.find((option) => option.id === draft.model)?.note ??
      'Modelo personalizado. Use o identificador exato aceito pela sua conta.',
    [draft.model]
  );

  const runTest = async () => {
    setTest({ status: 'testing' });
    try {
      const response = await fetch('/api/ai/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: draft.apiKey,
          baseUrl: normalizeBaseUrl(draft.baseUrl),
          model: draft.model.trim() || DEFAULT_AI_MODEL,
          useServerKey: draft.useServerKey,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || `Falha na validação (${response.status}).`);
      }
      setTest({ status: 'success', result: payload as AiTestResult });
      if (payload?.modelAvailable === false) {
        onNotify(
          'A chave respondeu, mas o modelo informado não aparece na lista da conta.',
          'info'
        );
      }
    } catch (error) {
      setTest({
        status: 'error',
        message: (error as Error).message || 'Não foi possível validar a API de IA.',
      });
    }
  };

  const handleSave = () => {
    const normalized: AiSettings = {
      ...draft,
      apiKey: draft.apiKey.trim(),
      baseUrl: normalizeBaseUrl(draft.baseUrl),
      model: draft.model.trim() || DEFAULT_AI_MODEL,
      includeImage: draft.includeImage && supportsVision(draft.model),
    };
    onSave(normalized);
    if (!normalized.apiKey && !(normalized.useServerKey && hasServerKey)) {
      onNotify(
        'Configuração salva sem chave. Adicione sua chave DeepSeek para gerar relatórios.',
        'info'
      );
    } else {
      onNotify('Configuração da API de IA salva.', 'success');
    }
  };

  return (
    <div
      className="fixed inset-0 z-[72] flex items-center justify-center bg-[#03050a]/85 p-2 backdrop-blur-md sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ai-settings-title"
        className="anim-in panel flex max-h-[min(94dvh,860px)] w-full max-w-2xl flex-col overflow-hidden"
      >
        <div className="flex shrink-0 items-start gap-3 border-b border-white/[0.07] px-4 py-3.5 sm:px-5">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-300 via-amber-500 to-orange-600 text-[#1b1305] shadow-[0_8px_22px_-10px_rgba(245,166,35,0.9)] ring-1 ring-white/20">
            <Sparkles className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="ai-settings-title" className="text-[15.5px] font-bold text-white">
              Configurar API de IA
            </h2>
            <p className="mt-0.5 text-[12px] leading-relaxed text-slate-400">
              Ambiente DeepSeek pré-configurado para os relatórios Dev. A chave fica apenas neste
              navegador.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar configuração da API de IA"
            className="btn btn-ghost btn-icon h-8 w-8 text-slate-400 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="scroll-area min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="chip chip-amber">
              <Server className="h-3 w-3" />
              DeepSeek API
            </span>
            <span className="chip">
              <KeyRound className="h-3 w-3" />
              {hasAnyKey ? 'chave disponível' : 'sem chave'}
            </span>
            <span className="chip chip-blue">
              <Gauge className="h-3 w-3" />
              {draft.depth === 'fast' ? 'rápida' : draft.depth === 'max' ? 'máxima' : 'equilibrada'}
            </span>
            <a
              href="https://platform.deepseek.com/api_keys"
              target="_blank"
              rel="noreferrer"
              className="ml-auto inline-flex items-center gap-1 text-[11.5px] font-semibold text-amber-300 transition-colors hover:text-amber-200"
            >
              Obter chave
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>

          {/* Chave */}
          <div className="mt-4">
            <label htmlFor="ai-api-key" className="label">
              Chave de API
            </label>
            <div className="field mt-2 flex items-center gap-1 pl-3 pr-1.5">
              <KeyRound className="h-3.5 w-3.5 shrink-0 text-slate-500" aria-hidden="true" />
              <input
                ref={keyInputRef}
                id="ai-api-key"
                type={showKey ? 'text' : 'password'}
                value={draft.apiKey}
                onChange={(event) => patch({ apiKey: event.target.value })}
                placeholder="sk-..."
                autoComplete="off"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                className="min-w-0 flex-1 bg-transparent py-2 font-mono text-[13px] text-slate-100 outline-none placeholder:text-slate-500"
              />
              <button
                type="button"
                onClick={() => setShowKey((previous) => !previous)}
                aria-label={showKey ? 'Ocultar chave' : 'Mostrar chave'}
                title={showKey ? 'Ocultar chave' : 'Mostrar chave'}
                className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-white/[0.06] hover:text-white"
              >
                {showKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
            </div>
            <div className="mt-1.5 flex items-start justify-between gap-2">
              <p className="text-[11px] leading-relaxed text-slate-500">
                Salva no <code className="rounded bg-white/[0.06] px-1">localStorage</code> deste
                navegador. Nunca é enviada a outro serviço além da própria DeepSeek.
              </p>
              {draft.apiKey && (
                <button
                  type="button"
                  onClick={() => patch({ apiKey: '' })}
                  className="shrink-0 text-[11px] font-semibold text-rose-300/90 transition-colors hover:text-rose-200"
                >
                  Limpar
                </button>
              )}
            </div>
          </div>

          {/* Chave do servidor */}
          <div className="mt-2.5 overflow-hidden rounded-xl border border-white/[0.07] bg-white/[0.015]">
            <Switch
              checked={hasServerKey && draft.useServerKey}
              onChange={(checked) => patch({ useServerKey: checked })}
              disabled={!hasServerKey}
              label="Usar chave do servidor"
              description={
                hasServerKey
                  ? 'DEEPSEEK_API_KEY detectada no ambiente. Sua chave acima tem prioridade.'
                  : 'Nenhuma DEEPSEEK_API_KEY encontrada no servidor. Informe sua chave acima.'
              }
            />
          </div>

          {/* Base URL e modelo */}
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="ai-base-url" className="label">
                Base URL
              </label>
              <input
                id="ai-base-url"
                type="text"
                value={draft.baseUrl}
                onChange={(event) => patch({ baseUrl: event.target.value })}
                spellCheck={false}
                autoComplete="off"
                className="field mt-2 w-full px-3 py-2 font-mono text-[12.5px] text-slate-200"
                placeholder={DEFAULT_AI_BASE_URL}
              />
              <p className="mt-1 text-[10.5px] leading-relaxed text-slate-500">
                Padrão: {DEFAULT_AI_BASE_URL}. Aceita gateways compatíveis.
              </p>
            </div>
            <div>
              <label htmlFor="ai-model" className="label">
                Modelo
              </label>
              <input
                id="ai-model"
                type="text"
                list="ai-model-options"
                value={draft.model}
                onChange={(event) => patch({ model: event.target.value })}
                spellCheck={false}
                autoComplete="off"
                className="field mt-2 w-full px-3 py-2 font-mono text-[12.5px] text-amber-200/90"
                placeholder={DEFAULT_AI_MODEL}
              />
              <datalist id="ai-model-options">
                {AI_MODEL_OPTIONS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.note}
                  </option>
                ))}
              </datalist>
              <div className="mt-1.5 flex flex-wrap gap-1">
                {AI_MODEL_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => patch({ model: option.id })}
                    aria-pressed={draft.model === option.id}
                    title={option.note}
                    className={cn(
                      'rounded border px-1.5 py-0.5 font-mono text-[10px] font-semibold transition-colors',
                      draft.model === option.id
                        ? 'border-amber-400/40 bg-amber-400/[0.1] text-amber-200'
                        : 'border-white/[0.1] bg-white/[0.02] text-slate-400 hover:border-white/[0.2] hover:text-slate-200'
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <p className="mt-1 text-[10.5px] leading-relaxed text-slate-500">{serverModelNote}</p>
            </div>
          </div>

          {/* Profundidade */}
          <div className="mt-4">
            <span className="label">Profundidade de análise</span>
            <div className="mt-2 grid gap-1.5 sm:grid-cols-3">
              {AI_DEPTH_OPTIONS.map((option) => {
                const active = draft.depth === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => patch({ depth: option.id })}
                    aria-pressed={active}
                    className={cn(
                      'rounded-xl border px-3 py-2.5 text-left transition-colors',
                      active
                        ? 'border-amber-400/50 bg-amber-400/[0.09]'
                        : 'border-white/[0.08] bg-white/[0.015] hover:border-white/[0.16]'
                    )}
                  >
                    <span
                      className={cn(
                        'block text-[12.5px] font-bold',
                        active ? 'text-amber-200' : 'text-slate-200'
                      )}
                    >
                      {option.label}
                    </span>
                    <span className="mt-0.5 block text-[10.5px] leading-snug text-slate-400">
                      {option.note}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Imagem */}
          <div className="mt-3 overflow-hidden rounded-xl border border-white/[0.07] bg-white/[0.015]">
            <Switch
              checked={draft.includeImage && vision}
              onChange={(checked) => patch({ includeImage: checked })}
              disabled={!vision}
              label="Enviar captura da tela para a IA"
              description={
                vision
                  ? 'Analisa visualmente composição, hierarquia e estilo. Modelos Flash aceitam imagens.'
                  : 'O modelo selecionado não declara suporte a imagens. A análise fica baseada no DOM/CSS.'
              }
            />
          </div>

          <div className="mt-2.5 flex items-start gap-2 rounded-xl border border-sky-400/15 bg-sky-400/[0.04] px-3 py-2.5">
            <ImageIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sky-300" />
            <p className="text-[11px] leading-relaxed text-slate-300">
              O relatório combina o dossiê do DOM/CSSOM com as imagens da página. O texto extraído
              e as capturas são enviados à DeepSeek somente quando você solicita um relatório.
            </p>
          </div>

          {/* Teste */}
          <div className="mt-4 rounded-xl border border-white/[0.07] bg-black/20 p-3">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => void runTest()}
                disabled={test.status === 'testing' || !hasAnyKey}
                className="btn btn-secondary btn-sm"
              >
                {test.status === 'testing' ? (
                  <Spinner className="h-3.5 w-3.5 text-amber-400" />
                ) : (
                  <Server className="h-3.5 w-3.5 text-slate-400" />
                )}
                Testar conexão
              </button>
              <span className="text-[11px] text-slate-500">
                Consulta a lista de modelos e o saldo da conta, sem gerar tokens.
              </span>
            </div>

            {test.status === 'success' && (
              <div className="mt-2.5 flex items-start gap-2 rounded-lg border border-emerald-400/20 bg-emerald-400/[0.05] px-2.5 py-2">
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-300" />
                <div className="min-w-0 text-[11.5px] leading-relaxed text-slate-300">
                  <p className="font-semibold text-emerald-200">
                    Conexão validada em {test.result.latencyMs} ms.
                  </p>
                  <p className="mt-0.5">
                    {test.result.models.length > 0
                      ? `${test.result.models.length} modelo(s) visíveis · ${
                          test.result.modelAvailable ? 'modelo atual disponível' : 'modelo atual não listado'
                        }`
                      : 'Endpoint /models respondeu.'}
                    {test.result.balance ? ` · Saldo: ${test.result.balance}` : ''}
                  </p>
                  {test.result.models.length > 0 && (
                    <p className="mt-1 truncate font-mono text-[10.5px] text-slate-400" title={test.result.models.map((model) => model.id).join(', ')}>
                      {test.result.models.map((model) => model.id).join(' · ')}
                    </p>
                  )}
                </div>
              </div>
            )}

            {test.status === 'error' && (
              <div className="mt-2.5 flex items-start gap-2 rounded-lg border border-rose-400/20 bg-rose-400/[0.05] px-2.5 py-2">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-300" />
                <p className="text-[11.5px] leading-relaxed text-rose-200">{test.message}</p>
              </div>
            )}
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-white/[0.07] bg-[#080b12]/90 px-4 py-3 sm:px-5">
          <button
            type="button"
            onClick={() => {
              setDraft({ ...DEFAULT_AI_SETTINGS });
              setTest({ status: 'idle' });
            }}
            className="btn btn-ghost btn-sm text-slate-400 hover:text-slate-200"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Restaurar padrão
          </button>
          <div className="flex items-center gap-2">
            <button type="button" onClick={onClose} className="btn btn-secondary btn-sm">
              Cancelar
            </button>
            <button type="button" onClick={handleSave} className="btn btn-primary btn-sm">
              <Save className="h-3.5 w-3.5" />
              Salvar configuração
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
