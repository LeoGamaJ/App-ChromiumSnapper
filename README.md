<div align="center">
  <img src="docs/preview.png" alt="Chromium Snapper — interface de captura em lote" width="100%" />
</div>

<h1 align="center">Chromium Snapper</h1>

<p align="center">
  Suite local de captura <strong>full-page em lote</strong> com Chromium headless,<br />
  streaming em tempo real, prévia navegável e exportação em ZIP.
</p>

<p align="center">
  <a href="#recursos">Recursos</a> ·
  <a href="#começando">Começando</a> ·
  <a href="#como-funciona">Como funciona</a> ·
  <a href="#api">API</a> ·
  <a href="#atalhos">Atalhos</a>
</p>

---

## Recursos

- **Captura em lote** de até 50 URLs por execução, com progresso via Server-Sent Events, ETA e interrupção a qualquer momento.
- **Viewport configurável**: presets Full HD, 4K, laptop, tablet e mobile, além de largura/altura personalizadas e emulação de `prefers-color-scheme`.
- **Saída flexível**: WebP, PNG, JPG e PDF vetorial contínuo, com controle de compressão para formatos com perda.
- **Renderização inteligente**: autoscroll progressivo, hidratação de imagens lazy, desbloqueio de overflow, estabilização de texturas/parallax, redução de grain e remoção de banners de consentimento (GDPR/LGPD).
- **Autenticação**: headers HTTP e cookies de sessão para capturar áreas logadas e ambientes de staging.
- **Nomenclatura tokenizada** (`[ordem]`, `[url]`, `[data]`, `[hora]`, `[resolucao]`, `[formato]`) com prévia do nome em tempo real.
- **Galeria profissional**: filtros por falha, prévia com zoom, navegação por teclado, cópia para clipboard, download individual e ZIP gerado no navegador.
- **Persistência local** de configurações e URLs, atalhos de teclado e acessibilidade (foco visível, focus trap, `aria-live` e `prefers-reduced-motion`).
- **100% local**: nenhuma imagem ou credencial é enviada a serviços externos.

<div align="center">
  <img src="docs/gallery.png" alt="Galeria de capturas com prévias, filtros e download em ZIP" width="100%" />
  <sub>Galeria com capturas reais em 1440×900 — prévias, metadados e exportação em ZIP.</sub>
</div>

## Stack

| Camada | Tecnologia |
| --- | --- |
| UI | React 19, TypeScript, Tailwind CSS 4, Lucide |
| Captura | Puppeteer + Chromium headless |
| Servidor | Express 4 + Vite (middleware mode) |
| Empacotamento | JSZip (client-side) |
| Tipografia | Plus Jakarta Sans + JetBrains Mono |

## Começando

**Requisitos:** Node.js 20+ e npm 10+.

```bash
npm install
npm run dev
```

Acesse **http://localhost:3000**.

> O Puppeteer baixa o Chromium compatível durante o `npm install`. Se o binário não estiver disponível, rode `npx puppeteer browsers install chrome`.

Para usar outra porta:

```bash
PORT=3001 npm run dev
```

### Scripts

| Script | Descrição |
| --- | --- |
| `npm run dev` | Servidor de desenvolvimento com Vite HMR e watch do backend. |
| `npm start` | Sobe o servidor sem watch. |
| `npm run build` | Gera o bundle de produção em `dist/`. |
| `npm run start:prod` | Serve o build de produção na porta padrão (3000). |
| `npm run lint` | Verifica tipos com `tsc --noEmit`. |
| `npm run clean` | Remove `dist/` e artefatos de build. |

**Produção:**

```bash
npm run build
npm run start:prod
# http://localhost:3000
```

## Como funciona

1. A UI envia as URLs e as configurações para `POST /api/screenshot/stream`.
2. O servidor abre uma página headless por URL, aplica headers/cookies/tema, aguarda fontes e mídia da hero, força o carregamento de imagens e faz o scroll progressivo para disparar lazy loads.
3. Cada captura é devolvida por SSE como `item_success` (com data URL + preview) ou `item_error`.
4. A galeria exibe as prévias e o download em ZIP é montado no próprio navegador com JSZip — sem re-renderizar as páginas.

## Arquitetura

```text
.
├── server.ts                  # Express, SSE de captura, pipeline do Chromium, ZIP server-side
├── index.html                 # Shell, metadados, fontes e favicon
├── src/
│   ├── App.tsx                # Estado global, streaming SSE, ZIP, atalhos e persistência
│   ├── index.css              # Design tokens, superfícies, botões, foco e animações
│   ├── lib/
│   │   └── snapper.ts         # Tipos, presets, tokens de nomenclatura e utilidades
│   ├── hooks/
│   │   ├── usePersistentState.ts
│   │   └── useFocusTrap.ts
│   └── components/
│       ├── TopBar.tsx
│       ├── ConfigPanel.tsx    # Abas Links / Viewport / Saída / Avançado
│       ├── ResultsPanel.tsx   # Status do lote, galeria, filtros e cards
│       ├── PreviewDialog.tsx  # Lightbox com zoom e navegação
│       ├── ShortcutsDialog.tsx
│       └── ui.tsx             # Switch, toasts, spinner e primitivos
└── docs/                      # Capturas usadas na documentação
```

## API

### `GET /api/health`

Retorna status, versão, engine, formatos e limite de URLs.

### `POST /api/screenshot/stream`

Content-Type: `application/json`. Responde com `text/event-stream`.

```json
{
  "urls": ["https://example.com", "https://example.org"],
  "format": "webp",
  "quality": 85,
  "width": 1920,
  "height": 1080,
  "fullPage": true,
  "enableAutoScroll": true,
  "heroWaitMs": 2000,
  "delayMs": 1200,
  "stabilizeTextures": true,
  "removeExcessGrain": false,
  "hideCookieBanners": true,
  "colorScheme": "no-preference",
  "namingPattern": "[ordem]_[url]_[resolucao]",
  "customHeaders": "Authorization: Bearer token",
  "customCookies": "session_id=abc123"
}
```

Eventos:

| Evento | Conteúdo |
| --- | --- |
| `start` | Total de URLs, formato e viewport. |
| `item_start` | Índice e URL em processamento. |
| `item_step` | Fase atual (`loading`, `hydrating`, `hero_settling`, `texture_stabilizing`, `scrolling`, `decoding`, `settling`, `capturing`). |
| `item_success` | Metadados, dimensões, duração, estatísticas de imagens, data URL e preview. |
| `item_error` | URL, mensagem de erro e duração. |
| `complete` | Fim do lote. |
| `fatal_error` | Falha que interrompeu o lote. |

### Endpoints auxiliares

- `POST /api/screenshot` — recebe o mesmo payload e devolve um ZIP gerado no servidor (útil para automações).
- `POST /api/screenshot/pack-zip` — empacota itens `{ fileName, format, dataUrl }` já capturados.

### Tokens de nomenclatura

| Token | Exemplo |
| --- | --- |
| `[ordem]` | `01` |
| `[url]` | `github_com` |
| `[data]` | `2026-11-05` |
| `[hora]` | `20-30-00` |
| `[resolucao]` | `1920x1080` (viewport solicitado) |
| `[formato]` | `webp`, `png`, `jpg`, `pdf` |

## Atalhos

| Atalho | Ação |
| --- | --- |
| `Ctrl` / `Cmd` + `Enter` | Iniciar captura do lote |
| `Esc` | Fechar prévia ou diálogo |
| `←` / `→` | Navegar entre capturas na prévia |
| `+` / `−` | Zoom na prévia |
| `0` | Ajustar imagem à tela |

## Limites e segurança

- Capturas são **sequenciais** para preservar memória e estabilidade do Chromium.
- Limite de **50 URLs** por lote; viewport entre 320 e 7680 px de largura (altura até 4320 px).
- Não há proteção SSRF: a ferramenta foi projetada para uso **local/confiável**. Não exponha o servidor publicamente.
- Headers e cookies ficam no `localStorage` do navegador. Use apenas em máquinas confiáveis.
- O servidor encerra o navegador e limpa o lote quando o cliente desconecta.

---

<p align="center"><sub>Chromium Snapper · v1.1.0 · processamento local-first</sub></p>
