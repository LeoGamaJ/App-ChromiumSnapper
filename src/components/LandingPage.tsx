import { useState } from 'react';
import { MAX_URLS } from '../lib/snapper';
import {
  Camera,
  ArrowRight,
  ShieldCheck,
  Zap,
  CheckCircle2,
  FileText,
  Lock,
  ChevronDown,
  Check,
  X,
  Laptop,
  Smartphone,
  Tablet,
} from 'lucide-react';

interface LandingPageProps {
  onLogin: () => void;
}

export function LandingPage({ onLogin }: LandingPageProps) {
  const [activeDevice, setActiveDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  return (
    <div className="landing-page relative min-h-screen bg-[#05070c] text-slate-200 selection:bg-amber-500/25 selection:text-amber-200">
      {/* Background Subtle Ambience */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      >
        <div className="absolute -top-[20%] left-1/2 h-[680px] w-[1100px] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(245,158,11,0.08)_0%,rgba(56,132,255,0.03)_45%,transparent_70%)] blur-[90px]" />
        <div className="absolute top-[45%] -left-[10%] h-[500px] w-[600px] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(245,166,35,0.04)_0%,transparent_60%)] blur-[100px]" />
        <div className="absolute bottom-[5%] right-[5%] h-[600px] w-[700px] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(56,132,255,0.04)_0%,transparent_65%)] blur-[110px]" />
        {/* Subtle grid pattern */}
        <div className="landing-dots" />
      </div>

      {/* Header / Navbar */}
      <header className="sticky top-0 z-50 border-b border-white/[0.07] bg-[#060910]/95 backdrop-blur-xl">
        <div className="flex h-[54px] w-full items-center justify-between gap-3 px-4 lg:px-6">
          {/* Brand */}
          <div className="flex items-center gap-2.5">
            <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] bg-gradient-to-br from-amber-300 via-amber-500 to-orange-600 shadow-[0_6px_18px_-6px_rgba(245,166,35,0.9)] ring-1 ring-white/25">
              <Camera className="h-4 w-4 text-[#1b1305]" strokeWidth={2.4} />
            </div>
            <div className="flex items-center gap-2.5">
              <span className="whitespace-nowrap text-[15.5px] font-extrabold tracking-[-0.02em] text-white">
                Chromium Snapper
              </span>
              <span className="hidden rounded-full border border-white/[0.08] bg-white/[0.03] px-2 py-0.5 font-mono text-[11px] text-slate-400 sm:inline">
                v1.1
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden items-center gap-6 text-[12.5px] font-medium text-slate-400 md:flex">
            <a href="#arquitetura" className="transition-colors hover:text-white">
              Como funciona
            </a>
            <a href="#recursos" className="transition-colors hover:text-white">
              Recursos
            </a>
            <a href="#comparativo" className="transition-colors hover:text-white">
              Comparativo
            </a>
            <a href="#casos-de-uso" className="transition-colors hover:text-white">
              Aplicações
            </a>
            <a href="#faq" className="transition-colors hover:text-white">
              FAQ
            </a>
          </nav>

          {/* Action / Login Button */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onLogin}
              className="btn btn-primary group gap-2"
            >
              <span>Entrar</span>
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10">
        {/* HERO SECTION */}
        <section className="relative px-4 pb-14 pt-14 sm:px-6 md:pt-20 lg:px-8 lg:pb-18">
          <div className="mx-auto max-w-[1120px] text-center">
            {/* Tagline / Eyebrow */}
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/25 bg-amber-400/[0.06] px-3 py-1.5 text-[11px] font-semibold tracking-[0.14em] text-amber-300 uppercase">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
              Captura de páginas inteiras
            </div>

            {/* Headline */}
            <h1 className="mt-6 text-[36px] font-extrabold leading-[1.06] tracking-[-0.04em] text-white sm:text-[48px] lg:text-[56px]">
              Capturas de página inteira{' '}
              <span className="text-amber-400">com fidelidade absoluta.</span>
            </h1>

            {/* Subtitle */}
            <p className="mx-auto mt-5 max-w-2xl text-[16px] leading-relaxed text-slate-400 sm:text-[17px]">
              Esqueça extensões frágeis que quebram elementos fixos ou ignoram o carregamento
              tardio. Uma plataforma para QA, auditoria visual, arquivamento e documentação —
              com viewport emulado e limpeza automática de ruídos.
            </p>

            {/* Hero CTAs */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={onLogin}
                className="btn btn-primary group px-5 py-3"
              >
                <span>Entrar no workspace</span>
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </button>

              <a
                href="#arquitetura"
                className="btn btn-secondary group gap-2 px-4 py-3"
              >
                <span>Como funciona</span>
                <ChevronDown className="h-4 w-4 text-slate-400 transition-transform group-hover:translate-y-0.5" />
              </a>
            </div>

            {/* Micro Metrics Badges */}
            <div className="mx-auto mt-11 grid max-w-4xl grid-cols-2 gap-px overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.07] text-left sm:grid-cols-4">
              <div className="flex flex-col gap-1 bg-[#080b12] px-4 py-3.5">
                <span className="text-[20px] font-bold text-white">100% Local</span>
                <span className="text-[11.5px] leading-snug text-slate-400">Zero transmissão externa de dados</span>
              </div>
              <div className="flex flex-col gap-1 bg-[#080b12] px-4 py-3.5">
                <span className="text-[20px] font-bold text-amber-300">Full HD & 4K</span>
                <span className="text-[11.5px] leading-snug text-slate-400">Emulação de viewport até 7680 px</span>
              </div>
              <div className="flex flex-col gap-1 bg-[#080b12] px-4 py-3.5">
                <span className="text-[20px] font-bold text-white">Full-Scroll</span>
                <span className="text-[11.5px] leading-snug text-slate-400">Disparo forçado de lazy-loading</span>
              </div>
              <div className="flex flex-col gap-1 bg-[#080b12] px-4 py-3.5">
                <span className="text-[20px] font-bold text-emerald-300">Multi-Formato</span>
                <span className="text-[11.5px] leading-snug text-slate-400">WebP, PNG, JPG e PDF</span>
              </div>
            </div>
          </div>

          {/* Interactive Engine Cockpit / Blueprint Mock */}
          <div className="mx-auto mt-11 max-w-6xl">
            <div className="relative rounded-xl border border-white/[0.08] bg-[#0a0e17]/90 p-2.5 shadow-[0_30px_70px_-45px_rgba(0,0,0,0.95)] backdrop-blur-xl sm:p-3">
              {/* Window Header */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.07] px-3 pb-3">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-rose-500/80" />
                  <span className="h-3 w-3 rounded-full bg-amber-500/80" />
                  <span className="h-3 w-3 rounded-full bg-emerald-500/80" />
                  <span className="ml-3 font-mono text-[12.5px] text-slate-400">
                    pipeline://render-session-0842.snap
                  </span>
                </div>

                {/* Device Selector Mock */}
                <div className="flex max-w-full items-center overflow-x-auto rounded-lg border border-white/10 bg-black/40 p-1">
                  <button
                    type="button"
                    onClick={() => setActiveDevice('desktop')}
                    className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[12.5px] font-medium transition-colors ${
                      activeDevice === 'desktop'
                        ? 'bg-amber-400/20 text-amber-300'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Laptop className="h-3 w-3" />
                    <span>Desktop (1920×1080)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveDevice('tablet')}
                    className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[12.5px] font-medium transition-colors ${
                      activeDevice === 'tablet'
                        ? 'bg-amber-400/20 text-amber-300'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Tablet className="h-3 w-3" />
                    <span>Tablet (768×1024)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveDevice('mobile')}
                    className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[12.5px] font-medium transition-colors ${
                      activeDevice === 'mobile'
                        ? 'bg-amber-400/20 text-amber-300'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Smartphone className="h-3 w-3" />
                    <span>Mobile (390×844)</span>
                  </button>
                </div>

                <div className="hidden items-center gap-2 font-mono text-[12.5px] text-emerald-400 sm:flex">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  DOM Estabilizado (3180ms)
                </div>
              </div>

              {/* Viewport Simulation Area */}
              <div className="relative mt-3 grid grid-cols-1 gap-4 lg:grid-cols-12">
                {/* Visual Canvas */}
                <div className="flex flex-col overflow-hidden rounded-xl border border-white/[0.08] bg-[#070a12] lg:col-span-8">
                  {/* Browser Bar */}
                  <div className="flex items-center gap-2 border-b border-white/[0.06] bg-black/40 px-3 py-2 text-[12.5px] text-slate-400">
                    <span className="font-mono text-slate-400">GET</span>
                    <span className="flex-1 truncate rounded bg-white/[0.03] px-2 py-0.5 font-mono text-[12px] text-slate-300">
                      https://stripe.com/enterprise/global-billing-infrastructure
                    </span>
                    <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[11px] font-bold text-emerald-400">
                      200 OK
                    </span>
                  </div>

                  {/* Rendered Preview Mock */}
                  <div className="relative h-[380px] overflow-hidden bg-gradient-to-b from-[#0b0f19] to-[#060810] p-6 font-sans">
                    <div className="space-y-4">
                      {/* Top banner mock - neutralized */}
                      <div className="flex items-center justify-between rounded-lg border border-amber-400/20 bg-amber-400/5 px-3 py-1.5 text-[11.5px] text-amber-300/80">
                        <span className="flex items-center gap-1.5 font-mono">
                          <CheckCircle2 className="h-3 w-3 text-amber-400" />
                          CSS Override: 3 banners de consentimento e overlays neutralizados
                        </span>
                        <span className="font-mono text-slate-400">display: none !important</span>
                      </div>

                      {/* Mocked Page Content */}
                      <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-5">
                        <div className="h-4 w-32 rounded bg-amber-400/30" />
                        <div className="mt-3 h-8 w-3/4 rounded-lg bg-white/20" />
                        <div className="mt-2 h-4 w-1/2 rounded bg-white/10" />

                        <div className="mt-6 grid grid-cols-3 gap-3">
                          <div className="h-24 rounded-lg border border-white/5 bg-white/[0.03] p-3">
                            <div className="h-3 w-12 rounded bg-white/20" />
                            <div className="mt-4 h-6 w-16 rounded bg-emerald-400/30" />
                          </div>
                          <div className="h-24 rounded-lg border border-white/5 bg-white/[0.03] p-3">
                            <div className="h-3 w-16 rounded bg-white/20" />
                            <div className="mt-4 h-6 w-20 rounded bg-blue-400/30" />
                          </div>
                          <div className="h-24 rounded-lg border border-white/5 bg-white/[0.03] p-3">
                            <div className="h-3 w-14 rounded bg-white/20" />
                            <div className="mt-4 h-6 w-16 rounded bg-amber-400/30" />
                          </div>
                        </div>

                        {/* Lazy load indicator */}
                        <div className="mt-5 flex items-center justify-between rounded border border-emerald-400/20 bg-emerald-400/5 px-3 py-2 text-[12px] text-emerald-300">
                          <span>Hidratação de nós profundos concluída: 48 imagens renderizadas</span>
                          <span className="font-mono">100% Viewport coverage</span>
                        </div>
                      </div>
                    </div>

                    {/* Laser Scan Line Effect */}
                    <div className="pointer-events-none absolute inset-x-0 top-1/2 h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent shadow-[0_0_15px_#f59e0b]" />
                  </div>
                </div>

                {/* Right Pipeline Inspection Telemetry */}
                <div className="flex flex-col justify-between rounded-xl border border-white/[0.08] bg-[#070a12] p-4 lg:col-span-4">
                  <div>
                    <span className="text-[12.5px] font-bold tracking-wider text-slate-400 uppercase">
                      Parâmetros da Sessão
                    </span>

                    <div className="mt-3 space-y-2.5 font-mono text-[12.5px]">
                      <div className="flex items-center justify-between border-b border-white/[0.05] pb-1.5">
                        <span className="text-slate-400">Emulação Viewport</span>
                        <span className="text-white">
                          {activeDevice === 'desktop'
                            ? '1920 × 1080 @2x'
                            : activeDevice === 'tablet'
                            ? '768 × 1024 @2x'
                            : '390 × 844'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between border-b border-white/[0.05] pb-1.5">
                        <span className="text-slate-400">Modo de Captura</span>
                        <span className="text-amber-300">Página Inteira (Full-Page)</span>
                      </div>
                      <div className="flex items-center justify-between border-b border-white/[0.05] pb-1.5">
                        <span className="text-slate-400">Formato de Saída</span>
                        <span className="text-white">PNG Lossless / PDF</span>
                      </div>
                      <div className="flex items-center justify-between border-b border-white/[0.05] pb-1.5">
                        <span className="text-slate-400">Delay de Hidratação</span>
                        <span className="text-emerald-400">1.200 ms</span>
                      </div>
                      <div className="flex items-center justify-between border-b border-white/[0.05] pb-1.5">
                        <span className="text-slate-400">Scroll Acelerado</span>
                        <span className="text-white">Ativo (Passos de 600px)</span>
                      </div>
                      <div className="flex items-center justify-between pb-1">
                        <span className="text-slate-400">Sanitização CSS</span>
                        <span className="text-emerald-400">Enabled</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 border-t border-white/[0.08] pt-4">
                    <button
                      type="button"
                      onClick={onLogin}
                      className="flex w-full items-center justify-center gap-2 rounded-lg bg-amber-400/15 py-2.5 text-[14px] font-bold text-amber-300 transition-colors hover:bg-amber-400/25"
                    >
                      <span>Abrir na Aplicação</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION: ARQUITETURA / COMO FUNCIONA */}
        <section id="arquitetura" className="relative border-t border-white/[0.07] px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <div className="mx-auto max-w-7xl">
            <div className="text-center">
              <span className="font-mono text-[12.5px] font-bold tracking-widest text-amber-400 uppercase">
                Como funciona
              </span>
              <h2 className="mt-3 text-[30px] font-extrabold tracking-[-0.03em] text-white sm:text-[36px]">
                Um fluxo de captura sob controle.
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-[17.5px] text-slate-400">
                Diferente de snapshots comuns que apenas copiam a janela visível, o Chromium Snapper
                executa um ciclo completo de renderização, acomodação de rede e estabilização de DOM.
              </p>
            </div>

            <div className="mt-16 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {/* Step 1 */}
              <div className="relative rounded-xl border border-white/[0.08] bg-[#080c14]/90 p-6 backdrop-blur">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-amber-400/30 bg-amber-400/10 font-mono text-[16px] font-bold text-amber-300">
                  01
                </div>
                <h3 className="mt-5 text-[18.5px] font-bold text-white">Configuração do Ambiente</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-slate-400">
                  Definição cirúrgica de viewport (até 4K e dimensões personalizadas),
                  user-agent e cabeçalhos de autenticação personalizados.
                </p>
              </div>

              {/* Step 2 */}
              <div className="relative rounded-xl border border-white/[0.08] bg-[#080c14]/90 p-6 backdrop-blur">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-amber-400/30 bg-amber-400/10 font-mono text-[16px] font-bold text-amber-300">
                  02
                </div>
                <h3 className="mt-5 text-[18.5px] font-bold text-white">Injeção & Sanitização CSS</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-slate-400">
                  Remoção de consentimentos de cookies, modais de newsletter e contenção de
                  menus com posição fixa que geram duplicações visuais.
                </p>
              </div>

              {/* Step 3 */}
              <div className="relative rounded-xl border border-white/[0.08] bg-[#080c14]/90 p-6 backdrop-blur">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-amber-400/30 bg-amber-400/10 font-mono text-[16px] font-bold text-amber-300">
                  03
                </div>
                <h3 className="mt-5 text-[18.5px] font-bold text-white">Scroll Sintético & Hidratação</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-slate-400">
                  Rolagem virtual programática por toda a extensão da página para forçar o disparo de
                  IntersectionObservers e acomodação de fontes web (anti-FOUT).
                </p>
              </div>

              {/* Step 4 */}
              <div className="relative rounded-xl border border-white/[0.08] bg-[#080c14]/90 p-6 backdrop-blur">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-amber-400/30 bg-amber-400/10 font-mono text-[16px] font-bold text-amber-300">
                  04
                </div>
                <h3 className="mt-5 text-[18.5px] font-bold text-white">Rasterização & Empacotamento</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-slate-400">
                  Captura unificada em PNG sem perdas, WebP balanceado ou PDF vetorial.
                  Download individual ou consolidado em um único ZIP.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION: RECURSOS / BENTO GRID */}
        <section id="recursos" className="relative border-t border-white/[0.07] px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <div className="mx-auto max-w-7xl">
            <div className="max-w-2xl">
              <span className="font-mono text-[12.5px] font-bold tracking-widest text-amber-400 uppercase">
                Recursos
              </span>
              <h2 className="mt-3 text-[30px] font-extrabold tracking-[-0.03em] text-white sm:text-[36px]">
                Feito para páginas reais.
              </h2>
              <p className="mt-3 text-[17.5px] text-slate-400">
                Todas as ferramentas necessárias para renderizar páginas dinâmicas, SPAs modernas
                e arquiteturas web complexas.
              </p>
            </div>

            <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-3">
              {/* Feature 1 - Large */}
              <div className="group relative rounded-xl border border-white/[0.08] bg-[#080c14]/90 p-6 transition-colors hover:border-amber-400/30 md:col-span-2">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-amber-400/25 bg-amber-400/10 text-amber-400">
                  <Zap className="h-6 w-6" />
                </div>
                <h3 className="mt-5 text-[18.5px] font-bold tracking-[-0.01em] text-white">
                  Hidratação Total de Mídias & Lazy Loading
                </h3>
                <p className="mt-3 text-[16px] leading-relaxed text-slate-400">
                  Páginas modernas dependem de scroll progressivo para renderizar imagens de alta resolução
                  e componentes React/Vue. Nosso algoritmo simula a passagem do usuário por toda a altura
                  da página, garantindo que nenhum placeholder cinza apareça no arquivo final.
                </p>
                <div className="mt-6 flex flex-wrap gap-2 text-[12.5px] font-mono text-slate-400">
                  <span className="rounded-md border border-white/10 bg-white/[0.03] px-2.5 py-1">
                    IntersectionObserver Safe
                  </span>
                  <span className="rounded-md border border-white/10 bg-white/[0.03] px-2.5 py-1">
                    Acomodação de Rede
                  </span>
                  <span className="rounded-md border border-white/10 bg-white/[0.03] px-2.5 py-1">
                    Anti-FOUT (Fontes Carregadas)
                  </span>
                </div>
              </div>

              {/* Feature 2 */}
              <div className="group relative rounded-xl border border-white/[0.08] bg-[#080c14]/90 p-6 transition-colors hover:border-amber-400/30">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-amber-400/25 bg-amber-400/10 text-amber-400">
                  <FileText className="h-6 w-6" />
                </div>
                <h3 className="mt-5 text-[18.5px] font-bold tracking-[-0.01em] text-white">PDFs Vetoriais</h3>
                <p className="mt-3 text-[16px] leading-relaxed text-slate-400">
                  Gere documentos com texto vetorial selecionável, preservando hiperlinks, tabelas de
                  especificação e fidelidade de layout para relatórios formais.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="group relative rounded-xl border border-white/[0.08] bg-[#080c14]/90 p-6 transition-colors hover:border-amber-400/30">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-amber-400/25 bg-amber-400/10 text-amber-400">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <h3 className="mt-5 text-[18.5px] font-bold tracking-[-0.01em] text-white">Supressão de Banners & Modais</h3>
                <p className="mt-3 text-[16px] leading-relaxed text-slate-400">
                  Injeção declarativa de regras CSS para silenciar avisos intrusivos de consentimento
                  de cookies, popups de lead e cabeçalhos fixos flutuantes.
                </p>
              </div>

              {/* Feature 4 - Large */}
              <div className="group relative rounded-xl border border-white/[0.08] bg-[#080c14]/90 p-6 transition-colors hover:border-amber-400/30 md:col-span-2">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-amber-400/25 bg-amber-400/10 text-amber-400">
                  <Lock className="h-6 w-6" />
                </div>
                <h3 className="mt-5 text-[18.5px] font-bold tracking-[-0.01em] text-white">
                  Privacidade Absoluta e Isolamento Local
                </h3>
                <p className="mt-3 text-[16px] leading-relaxed text-slate-400">
                  Seus dados nunca passam por servidores de terceiros. Dashboards internos, páginas de
                  desenvolvimento em `localhost` e áreas autenticadas de clientes são processadas
                  diretamente no ambiente local com total conformidade de segurança.
                </p>
                <div className="mt-6 flex flex-wrap gap-2 text-[12.5px] font-mono text-slate-400">
                  <span className="rounded-md border border-white/10 bg-white/[0.03] px-2.5 py-1">
                    Zero Transmissão Externa
                  </span>
                  <span className="rounded-md border border-white/10 bg-white/[0.03] px-2.5 py-1">
                    Compatível com Intranets
                  </span>
                  <span className="rounded-md border border-white/10 bg-white/[0.03] px-2.5 py-1">
                    Bypass de Autenticação Segura
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION: COMPARATIVO */}
        <section id="comparativo" className="relative border-t border-white/[0.07] px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <div className="mx-auto max-w-5xl">
            <div className="text-center">
              <span className="font-mono text-[12.5px] font-bold tracking-widest text-amber-400 uppercase">
                O Problema Real vs. A Solução
              </span>
              <h2 className="mt-3 text-[30px] font-extrabold tracking-[-0.03em] text-white sm:text-[36px]">
                Por que soluções convencionais falham?
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-[17.5px] text-slate-400">
                Uma comparação direta entre extensões genéricas de navegador e o motor
                dedicado do Chromium Snapper.
              </p>
            </div>

            <div className="mt-10 overflow-x-auto rounded-xl border border-white/[0.09] bg-[#080c14]/90">
              <table className="w-full min-w-[560px] text-left text-[15.5px]">
                <thead>
                  <tr className="border-b border-white/[0.08] bg-white/[0.02]">
                    <th className="py-4.5 px-6 font-semibold text-slate-300">Critério Técnico</th>
                    <th className="py-4.5 px-6 font-semibold text-slate-400">Extensões Genéricas</th>
                    <th className="py-4.5 px-6 font-bold text-amber-300">Chromium Snapper</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06]">
                  <tr>
                    <td className="py-4 px-6 font-medium text-white">Imagens em Lazy-Loading</td>
                    <td className="py-4 px-6 text-slate-400">
                      <span className="inline-flex items-center gap-1.5 text-rose-400">
                        <X className="h-4 w-4" /> Quebra em blocos cinzas
                      </span>
                    </td>
                    <td className="py-4 px-6 text-emerald-400 font-medium">
                      <span className="inline-flex items-center gap-1.5">
                        <Check className="h-4 w-4" /> Scroll progressivo determinístico
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td className="py-4 px-6 font-medium text-white">Cabeçalhos Fixos (Sticky Nav)</td>
                    <td className="py-4 px-6 text-slate-400">
                      <span className="inline-flex items-center gap-1.5 text-rose-400">
                        <X className="h-4 w-4" /> Duplica no meio da imagem
                      </span>
                    </td>
                    <td className="py-4 px-6 text-emerald-400 font-medium">
                      <span className="inline-flex items-center gap-1.5">
                        <Check className="h-4 w-4" /> Sanitização CSS inteligente
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td className="py-4 px-6 font-medium text-white">Privacidade e Localhost</td>
                    <td className="py-4 px-6 text-slate-400">
                      <span className="inline-flex items-center gap-1.5 text-rose-400">
                        <X className="h-4 w-4" /> Envia dados para nuvem opaca
                      </span>
                    </td>
                    <td className="py-4 px-6 text-emerald-400 font-medium">
                      <span className="inline-flex items-center gap-1.5">
                        <Check className="h-4 w-4" /> 100% Local-first na sua máquina
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td className="py-4 px-6 font-medium text-white">Exportação em Lote</td>
                    <td className="py-4 px-6 text-slate-400">
                      <span className="inline-flex items-center gap-1.5 text-slate-400">
                        Manual, aba por aba
                      </span>
                    </td>
                    <td className="py-4 px-6 text-emerald-400 font-medium">
                      <span className="inline-flex items-center gap-1.5">
                        <Check className="h-4 w-4" /> Lote simultâneo com download ZIP
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td className="py-4 px-6 font-medium text-white">Documentos PDF Vetoriais</td>
                    <td className="py-4 px-6 text-slate-400">
                      <span className="inline-flex items-center gap-1.5 text-rose-400">
                        <X className="h-4 w-4" /> Apenas impressão simples do browser
                      </span>
                    </td>
                    <td className="py-4 px-6 text-emerald-400 font-medium">
                      <span className="inline-flex items-center gap-1.5">
                        <Check className="h-4 w-4" /> PDF vetorial nativo com texto selecionável
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* SECTION: CASOS DE USO */}
        <section id="casos-de-uso" className="relative border-t border-white/[0.07] px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <div className="mx-auto max-w-7xl">
            <div className="text-center">
              <span className="font-mono text-[12.5px] font-bold tracking-widest text-amber-400 uppercase">
                Aplicações Práticas
              </span>
              <h2 className="mt-3 text-[30px] font-extrabold tracking-[-0.03em] text-white sm:text-[36px]">
                Onde o Chromium Snapper faz a diferença
              </h2>
            </div>

            <div className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-white/[0.08] bg-[#080c14]/80 p-6">
                <span className="text-[14px] font-mono text-amber-400 font-semibold">01 / ENGENHARIA</span>
                <h4 className="mt-2 text-[18.5px] font-bold text-white">Visual Regression & QA</h4>
                <p className="mt-2 text-[15px] text-slate-400">
                  Comparações pixel-perfect entre deploys, validações de responsividade em diferentes viewports e testes de interface.
                </p>
              </div>

              <div className="rounded-xl border border-white/[0.08] bg-[#080c14]/80 p-6">
                <span className="text-[14px] font-mono text-amber-400 font-semibold">02 / JURÍDICO</span>
                <h4 className="mt-2 text-[18.5px] font-bold text-white">Auditoria & Compliance</h4>
                <p className="mt-2 text-[15px] text-slate-400">
                  Registro imutável e com timestamp de termos de uso, preços de e-commerce e portais de políticas com fidelidade probatória.
                </p>
              </div>

              <div className="rounded-xl border border-white/[0.08] bg-[#080c14]/80 p-6">
                <span className="text-[14px] font-mono text-amber-400 font-semibold">03 / DESIGN</span>
                <h4 className="mt-2 text-[18.5px] font-bold text-white">Design Systems & Benchmarks</h4>
                <p className="mt-2 text-[15px] text-slate-400">
                  Coleta de referências em escala real, documentação de microinterações e estudos competitivos de UX/UI.
                </p>
              </div>

              <div className="rounded-xl border border-white/[0.08] bg-[#080c14]/80 p-6">
                <span className="text-[14px] font-mono text-amber-400 font-semibold">04 / PRODUTO</span>
                <h4 className="mt-2 text-[18.5px] font-bold text-white">Relatórios & Apresentações</h4>
                <p className="mt-2 text-[15px] text-slate-400">
                  Capturas limpas e prontas para exportação em alta resolução para decks de investidores e documentações de sprint.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION: FAQ */}
        <section id="faq" className="relative border-t border-white/[0.07] px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <div className="mx-auto max-w-4xl">
            <div className="text-center">
              <span className="font-mono text-[12.5px] font-bold tracking-widest text-amber-400 uppercase">
                Tira-Dúvidas
              </span>
              <h2 className="mt-3 text-[30px] font-extrabold tracking-[-0.03em] text-white sm:text-[36px]">
                Perguntas Frequentes
              </h2>
            </div>

            <div className="mt-9 space-y-3">
              {[
                {
                  q: 'Como funciona a captura de páginas muito extensas?',
                  a: 'O motor calcula dinamicamente a altura total do documento (document.body.scrollHeight) após disparar o ciclo de scroll progressivo. O canvas final é gerado em uma única peça sem cortes ou costuras artificiais.',
                },
                {
                  q: 'É possível capturar páginas que exigem login ou credenciais?',
                  a: 'Sim. A aplicação aceita headers HTTP e cookies de sessão para capturar áreas autenticadas e ambientes de staging.',
                },
                {
                  q: 'O processamento consome servidores externos?',
                  a: 'Não. O processamento é 100% local ou executado em seu nó dedicado Chromium. Nenhuma informação ou imagem trafega por servidores de terceiros.',
                },
                {
                  q: 'Quantas URLs posso processar por lote?',
                  a: `O processamento é sequencial para preservar a estabilidade do Chromium: lotes de até ${MAX_URLS} URLs, com status em tempo real por URL e exportação consolidada em ZIP.`,
                },
              ].map((faq, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-white/[0.08] bg-[#080c14]/90 overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => toggleFaq(idx)}
                    className="flex w-full items-center justify-between p-5 text-left text-[17.5px] font-semibold text-white transition-colors hover:bg-white/[0.02]"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown
                      className={`h-4 w-4 text-slate-400 transition-transform ${
                        openFaq === idx ? 'rotate-180 text-amber-400' : ''
                      }`}
                    />
                  </button>
                  {openFaq === idx && (
                    <div className="border-t border-white/[0.05] p-5 text-[16px] leading-relaxed text-slate-400">
                      {faq.a}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* SECTION: FINAL CALL TO ACTION */}
        <section className="relative px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <div className="landing-cta mx-auto max-w-5xl overflow-hidden rounded-2xl border border-white/[0.09] p-8 text-center md:p-12">
            <span className="font-mono text-[12.5px] font-bold tracking-widest text-amber-300 uppercase">
              Pronto para iniciar
            </span>
            <h2 className="mt-3 text-[30px] font-extrabold tracking-[-0.03em] text-white sm:text-[42px]">
              Entre e comece suas capturas agora.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-[17.5px] text-slate-300">
              Acesse a área principal do Chromium Snapper com um clique e execute lotes de
              capturas com precisão milimétrica.
            </p>

            <div className="mt-8 flex justify-center">
              <button
                type="button"
                onClick={onLogin}
                className="group inline-flex items-center gap-3 rounded-xl border border-amber-300/60 bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 px-8 py-4 text-[18.5px] font-extrabold text-[#1b1305] shadow-[0_15px_35px_-10px_rgba(245,166,35,0.85)] transition-all hover:brightness-105 active:scale-[0.98]"
              >
                <span>Entrar no workspace</span>
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-white/[0.07] bg-[#04060a] px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 sm:flex-row">
          <div className="flex items-center gap-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-amber-300 to-orange-600">
              <Camera className="h-3.5 w-3.5 text-[#1b1305]" strokeWidth={2.4} />
            </div>
            <span className="text-[13px] font-bold text-white">Chromium Snapper</span>
          </div>

          <div className="text-[14px] text-slate-400">
            Captura local de alta fidelidade · Todos os direitos reservados.
          </div>

          <div>
            <button
              type="button"
              onClick={onLogin}
              className="text-[14.5px] font-medium text-amber-400 hover:text-amber-300 transition-colors"
            >
              Entrar no workspace &rarr;
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
