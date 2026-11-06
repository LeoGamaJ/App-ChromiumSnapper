# Auditoria de UX/UI — Chromium Snapper

**Documento de melhorias e otimizações de experiência e interface**

- **Versão analisada:** 1.1.0
- **Data:** 06/11/2026
- **Escopo:** landing page, workspace de captura, canvas, inspetor, prévia e exportação — desktop e mobile.
- **Método:** revisão estática do código (`src/`, `server.ts`, `index.html`), análise das capturas em `docs/`, heurísticas de Nielsen e critérios **WCAG 2.2 AA**.
- **Limite desta rodada:** não houve teste moderado com usuários nem validação com leitor de tela real. As recomendações são priorizadas por impacto e devem ser confirmadas com 5–8 sessões de teste.

> **Resumo em uma frase:** a identidade visual é forte, o fluxo principal já funciona e o produto tem personalidade; os maiores ganhos estão em **não sobrecarregar memória/rede com imagens**, **não perder dados silenciosamente**, **tornar o inspetor e as ações acessíveis em telas menores**, **elevar contraste e legibilidade** e **dar visibilidade à fila antes da primeira captura**.

> **Atualização de implementação — 06/11/2026:** as tarefas **PERF-01**, **FORM-01**, **FORM-02**, **FB-08**, **A11Y-01**, **RESP-01**, **FB-01**, **PERF-02**, **A11Y-02**, **COPY-01** e **PERF-05** foram implementadas. Elas aparecem riscadas e com a observação **Concluído**; o restante do documento permanece como backlog. Os detalhes de implementação estão no início de cada seção correspondente.

---

## 1. Sumário executivo

### 1.1 O que já está bem resolvido (preservar)

- **Identidade visual coesa e memorável:** estúdio escuro, âmbar como cor de marca, tipografia Plus Jakarta Sans + JetBrains Mono. O canvas com artboards é o grande diferencial de produto.
- **Hierarquia de três superfícies** (configuração → canvas → inspetor) é correta para uma ferramenta profissional e deve ser mantida, não transformada em wizard.
- **Cuidado com acessibilidade acima da média:** foco visível global, `useFocusTrap` em diálogos, `prefers-reduced-motion`, `aria-live` de progresso, `role="progressbar"`, navegação por teclado nos tabs e rótulos ARIA na maioria dos ícones.
- **Persistência local** de configurações e URLs, com fallback seguro para storage indisponível.
- **Empty state e landing page** têm acabamento, narrativa e CTAs claros; a landing comunica bem o valor.
- **Feedback de execução** com SSE, fases, ETA, banner de resultado e cards de erro com retentativa.
- **Boas decisões de sistema:** `clamp` de dimensões, deduplicação de URLs, preview de nomenclatura, toasts com ícones e estados de carregamento.

### 1.2 Os ajustes de maior impacto

| # | ID | Problema | Por que agora | Sev. | Esforço |
|---|----|----------|----------------|------|---------|
| 1 | ~~PERF-01~~ | ~~A imagem em resolução total é enviada **duas vezes** no mesmo evento SSE e decodificada em cada card~~<br>**✅ Concluído** | Lotes de 20–50 páginas 4K podem travar ou derrubar a aba | P0 | G |
| 2 | ~~FORM-01~~ | ~~Nomes de arquivo colidem e sobrescrevem entradas no ZIP; `[data]` usa UTC~~<br>**✅ Concluído** | Perda silenciosa de arquivos em lotes com padrão customizado | P0 | P |
| 3 | ~~FORM-02~~ | ~~"Limpar lista" e remover card são imediatos; "links de exemplo" **substitui** as URLs digitadas~~<br>**✅ Concluído** | Perda de trabalho sem confirmação ou desfazer | P0 | P |
| 4 | ~~FB-08~~ | ~~Refresh/fechar a aba descarta todas as capturas; "Sair" também descarta~~<br>**✅ Concluído** | Usuário perde um lote inteiro sem aviso | P0 | P |
| 5 | ~~A11Y-01~~ | ~~Textos secundários em `slate-600` têm **2,6:1** e `slate-500` **4,1:1** em fundos escuros~~<br>**✅ Concluído** | Falha WCAG 1.4.3 e baixa legibilidade em telas reais | P0 | P |
| 6 | ~~RESP-01~~ | ~~Inspetor fica **inacessível abaixo de 1536 px** (não há toggle visível)~~<br>**✅ Concluído** | Notebooks de 13–15" e tablets não acessam detalhes | P1 | M |
| 7 | ~~FB-01~~ | ~~Canvas fica vazio até a primeira captura; não há visão da fila nem status por URL~~<br>**✅ Concluído** | Sensação de travamento e pouca previsibilidade em lotes longos | P1 | M |
| 8 | ~~PERF-02~~ | ~~ZIP é montado na thread principal com base64 e progresso "falso" em arquivos~~<br>**✅ Concluído** | UI congela por segundos/minutos em lotes grandes | P1 | M |
| 9 | ~~A11Y-02~~ | ~~Botão de remover do card fica `opacity: 0` e continua focável pelo teclado~~<br>**✅ Concluído** | Controle invisível para usuários de teclado | P1 | P |
| 10 | ~~COPY-01~~ | ~~Landing promete 25 URLs simultâneas, ZIP criptografado e 100% local, mas carrega fontes do Google~~<br>**✅ Concluído** | Quebra de confiança e risco de compliance | P1 | P |

### 1.3 Como ler este documento

| Severidade | Significado |
|---|---|
| **P0** | Impede concluir a tarefa, causa perda de dados ou falha crítica de acessibilidade. Corrigir antes de novas features. |
| **P1** | Atrito recorrente que reduz velocidade, confiança ou alcance. Entrar no próximo ciclo. |
| **P2** | Polimento, consistência e escala. Backlog contínuo. |

| Esforço | Ordem de grandeza |
|---|---|
| **PP** | < 1 dia |
| **P** | 1–3 dias |
| **M** | 3–10 dias |
| **G** | > 10 dias ou envolve mudança de backend/arquitetura |

---

## 2. Princípios de design propostos

Para evitar decisões pontuais conflitantes, sugiro adotar estes seis princípios como critério de revisão:

1. **Uma ação primária por região.** Na topbar, no painel de configuração e no canvas, apenas um CTA preenchido em âmbar por vez. Ações secundárias viram contorno, ícone ou menu.
2. **O canvas é o herói, mas a fila precisa ser visível.** O usuário deve saber o que está pendente, processando, concluído e com falha sem abrir outro painel.
3. **Estado visível, não deduzido.** Autosave, colapso de painéis, filtros, densidade e seleção devem deixar rastro visual; nada de "sumiu e não sei por quê".
4. **Prevenir > explicar > recuperar.** Valide antes de executar, explique o erro em linguagem de tarefa e ofereça desfazer/retentar. Toasts não substituem validação.
5. **Acessível por padrão.** Contraste, alvo de toque, foco, rótulo e leitor de tela são parte da definição de pronto — não uma fase final.
6. **Densidade com respiro.** É uma ferramenta pro: informação densa é bem-vinda, mas com escala tipográfica, alinhamento e agrupamento consistentes.
7. **Verdade no conteúdo.** Nenhuma promessa de marketing deve divergir do comportamento real ou dos limites do motor.

---

## 3. Fluxo e arquitetura da informação

### IA-01 · O fluxo "Preparar → Capturar → Revisar" não está explícito

**Severidade:** P1 · **Esforço:** M · **Onde:** `src/App.tsx:692-834`, `src/components/TopBar.tsx:73-96`, `src/components/ConfigPanel.tsx:136-315`

O workspace apresenta três colunas e quatro abas, mas não comunica em que etapa o usuário está nem qual é o próximo passo. O breadcrumb "Workspace › Captura em lote" é decorativo; o botão principal aparece em locais diferentes conforme o estado dos painéis.

**Recomendação**

- Adicionar um **indicador de etapa compacto** na topbar ou acima do canvas: `1 Preparar · 2 Capturar · 3 Revisar`, com a etapa atual destacada e um resumo ao lado: `3 na fila · 0 capturadas · 0 falhas`.
- Fazer o CTA principal refletir o contexto: com fila pronta → **Capturar N links**; com lote concluído → **Baixar ZIP** em destaque no canvas; com falhas → **Tentar falhas**.
- Não transformar em wizard bloqueante. O indicador é orientação, não sequência obrigatória; usuários avançados devem poder capturar a qualquer momento.
- Ligar o vazio inicial ao primeiro passo: o empty state deve apontar para o campo de URLs, não apenas descrever o fluxo.

**Aceite:** em teste com 5 usuários de primeira viagem, todos identificam o próximo passo sem instrução; nenhuma etapa adicional de clique é introduzida para quem já conhece a ferramenta.

---

### IA-02 · Existem até três CTAs primários iguais na mesma tela

**Severidade:** P1 · **Esforço:** P · **Onde:** `TopBar.tsx:173-200`, `ConfigPanel.tsx:287-312`, `ConfigRail.tsx:88-106`, `ResultsPanel.tsx:194-216`

Com a configuração expandida, o CTA aparece no rodapé do painel. Ao recolhê-la, o CTA reaparece na topbar **e** no rail esquerdo (dois botões âmbar adjacentes). No canvas, "Baixar .zip" também é âmbar e compete visualmente com "Capturar".

**Recomendação**

- **Topbar:** manter o CTA de captura apenas quando a configuração estiver recolhida ou em modo foco.
- **Rail de configuração:** remover o botão de play e deixar apenas contador + "Expandir". O rail é navegação, não execução.
- **Configuração expandida:** o CTA do rodapé é o único primário; a topbar fica sem duplicata.
- **ZIP:** usar `btn-secondary` (contorno) enquanto houver capturas; transformá-lo em primário somente no estado "lote concluído", quando a próxima ação natural é exportar. Nunca dois preenchidos âmbar simultâneos.
- Manter a posição do CTA estável para criar memória muscular.

**Aceite:** teste visual em 1024, 1440 e 1920 px: no máximo um botão preenchido âmbar por região; nenhuma ação primária "pula" de lugar ao recolher/expandir painéis.

---

### IA-03 · O gate "Entrar" parece autenticação, mas é só estado local

**Severidade:** P2 · **Esforço:** P · **Onde:** `App.tsx:127-133`, `LandingPage.tsx:83-90`, `README.md:43-47`

"Entrar" e "Entrar no workspace" sugerem login, mas o acesso é um `sessionStorage` sem autenticação. Isso gera expectativa errada e um clique extra para uma ferramenta local.

**Recomendação**

- Renomear para **"Abrir workspace"** ou **"Ir para o app"**; se mantiver o gate por motivo de apresentação, adicionar selo "ambiente local, sem login".
- Se autenticação real for planejada, sinalizar "em breve" apenas quando houver compromisso de entrega; caso contrário, remover a promessa.
- Criar rotas reais (`/` e `/app`) para que o botão Voltar do navegador funcione e o workspace seja favoritável.

---

### IA-04 · A fila não tem representação visual

**Severidade:** P1 · **Esforço:** M · **Onde:** `App.tsx:305-352`, `ResultsPanel.tsx:252-318`, `ConfigPanel.tsx:269-314`

O progresso mostra apenas "Capturando X de Y"; os URLs pendentes não aparecem no canvas. Em um lote de 40 páginas, o usuário vê uma tela vazia por dezenas de segundos e não sabe se a captura está andando, se travou ou qual URL falhou.

**Recomendação**

- Ao iniciar o lote, **semear o canvas com um card por URL** em estado `pending`, com host, posição na fila e skeleton. Cada card evolui para `processing` (com a fase atual), `success` (substitui o skeleton pela imagem) ou `error` (card de falha com retry).
- Para não duplicar estado, estender `CapturedItem` com `status: 'pending' | 'processing' | 'success' | 'error'` e separar a fila dos resultados exportáveis.
- Alternativa mínima: lista compacta da fila no rodapé da configuração com bolinhas de status e o item atual destacado.
- Anunciar a mudança de status por item apenas uma vez (ver A11Y-03).

**Aceite:** ao iniciar um lote de 10 URLs, todos os 10 cards aparecem em menos de 1 s; o usuário identifica a URL atual e as pendentes sem abrir outro painel; nenhum salto de layout quando o card é preenchido.

---

### IA-05 · Terminologia inconsistente

**Severidade:** P2 · **Esforço:** P · **Onde:** `ResultsPanel.tsx:119-135`, `ResultsPanel.tsx:323-339`, `Inspector.tsx:477-482`, `ConfigPanel.tsx:271-285`

Na mesma tela convivem "3 links", "3 capturas", "3 artboards", "3 prontas" e "Galeria". Para quem usa a ferramenta, "link" é a URL da fila e "captura" é o resultado; "artboard" é metáfora de canvas, não unidade de dado.

**Recomendação**

- Glossário curto e aplicado em todo o produto:
  - **Link/URL** = item da fila.
  - **Captura** = arquivo gerado.
  - **Lote/execução** = conjunto processado.
  - **Canvas/Galeria** = área de revisão (escolher um e manter).
- Evitar "artboard" em textos funcionais; se mantiver como conceito visual, apresentá-lo apenas no empty state ou em tooltip.
- Revisar pluralização com `Intl.PluralRules` e remover construções manuais (`capturas`/`falhas`).

**Aceite:** busca por "artboard" retorna apenas conteúdo explicativo; contadores usam o mesmo substantivo em todos os painéis.

---

### IA-06 · Sem rotas, sem título por tela e sem histórico

**Severidade:** P2 · **Esforço:** P · **Onde:** `App.tsx:127-133`, `index.html:7`

O título permanece "Chromium Snapper — Capturas full-page em lote" em qualquer tela; o botão Voltar do navegador sai do app em vez de retornar à landing; não há link direto para o workspace. Isso também prejudica leitores de tela, que dependem de mudanças de título para orientação.

**Recomendação**

- Rotas com History API (`/` e `/app`) ou hash (`#/app`) se o deploy não tiver fallback SPA.
- `document.title` contextual: "Capturas — Chromium Snapper", "Prévia — host — Chromium Snapper".
- Ao trocar de view, mover o foco para o `h1`/`main` e anunciar a nova tela.
- Adicionar link "Pular para as capturas" no início do workspace.

---

### IA-07 · Onboarding limitado ao empty state

**Severidade:** P2 · **Esforço:** M · **Onde:** `ResultsPanel.tsx:461-560`

O empty state é bonito e didático, mas desaparece após a primeira captura e não explica atalhos, painéis retráteis ou diferença entre as abas.

**Recomendação**

- Check-list de primeira execução dismissível: "1. Cole URLs · 2. Escolha viewport · 3. Capture · 4. Baixe o ZIP", com links que focam o controle correspondente.
- Tour opcional de 3 passos (config, canvas, inspetor) acionado por "?" e nunca bloqueante.
- Persistir conclusão em `localStorage` e permitir reabrir em "Ajuda › Tour".

---

## 4. Hierarquia visual e layout

### VIS-01 · Âmbar acumula quatro significados

**Severidade:** P1 · **Esforço:** P · **Onde:** `index.css:290-398`, `ResultsPanel.tsx:610-614`, `ConfigPanel.tsx:417-423`, `ui.tsx:85-105`

Âmbar é marca, ação primária, seleção de card, progresso e destaque de aba ativa. Quando tudo é âmbar, nada é prioridade. Em uma tela com ZIP primário, card selecionado e progresso, o olho não encontra o próximo passo.

**Recomendação**

- Definir papéis semânticos:
  - **Marca/CTA primário:** âmbar preenchido.
  - **Seleção:** anel azul ou branco + check; reservar âmbar para ação.
  - **Progresso em andamento:** âmbar apenas dentro do banner/barra de progresso.
  - **Sucesso/erro/aviso:** verde, rosa e um amarelo de aviso distinto (ícone + texto, nunca só cor).
- Aplicar seleção em cards com `ring-2 ring-sky-400/60` (ou branco) e manter o check; o card selecionado deixa de competir com o botão de captura.
- Revisar o foco: anel âmbar sobre botão âmbar tem pouco contraste; usar anel duplo (escuro + claro) para garantir 3:1 do indicador (WCAG 1.4.11).

**Aceite:** em captura em escala de cinza, o CTA primário continua sendo o elemento de maior peso; teste de 5 segundos identifica "ação principal" e "item selecionado" sem ambiguidade.

---

### VIS-02 · Feedback duplicado em quatro lugares

**Severidade:** P2 · **Esforço:** P · **Onde:** `ResultsPanel.tsx:241-250, 346-457`, `Inspector.tsx:437-502`, `App.tsx:455-481`, `ConfigPanel.tsx:269-285`

O mesmo estado aparece no banner do canvas, no inspetor, nos chips do rodapé da configuração, no rodapé do canvas e em toasts. Em execução, a tela fala a mesma coisa quatro vezes; em erro, três.

**Recomendação**

- Uma fonte de verdade por região:
  - Banner do canvas: estado global e próxima ação.
  - Inspetor: detalhe do item selecionado.
  - Rodapé da configuração: resumo estático da configuração, sem status de execução.
  - Toasts: apenas eventos transitórios ou acionáveis (ex.: "3 capturas removidas · Desfazer").
- Eliminar o toast de "Lote finalizado" quando o banner já está visível; manter toast apenas se o usuário estiver em outra rolagem/aba.
- Em erro, um único ponto persistente com "Tentar falhas" + detalhes.

---

### VIS-03 · Thumbnails 16:10 escondem a característica principal: a página inteira

**Severidade:** P2 · **Esforço:** M · **Onde:** `ResultsPanel.tsx:641-666`, `Inspector.tsx:183-202`

O produto se chama "full-page", mas todos os cards mostram o topo da página cortado em 16:10. Duas páginas de 6.000 px e 30.000 px parecem iguais. Isso reduz a capacidade de revisão visual e a percepção de valor.

**Recomendação**

- Oferecer dois modos de thumbnail: **Topo (crop)** e **Página inteira**, este último com proporção real limitada a uma altura máxima (ex.: 420 px), fundo desfocado e etiqueta `8.755 px` / `10.891 px`.
- Default sugerido: **Página inteira** para um produto de captura full-page; crop apenas na densidade compacta.
- Mostrar a altura da página como dado de primeira classe no card, não apenas no inspetor.
- Se a página for muito longa, adicionar um gradiente e a indicação "continua"; não tentar renderizar 1:50 em miniatura sem affordance.

**Aceite:** uma página curta e uma longa são distinguíveis à primeira vista; o modo escolhido persiste; o custo de memória não aumenta (usar a thumbnail já gerada).

---

### VIS-04 · Padrões de estado ativo diferentes para controles equivalentes

**Severidade:** P2 · **Esforço:** P · **Onde:** `ConfigPanel.tsx:215-230, 604-632, 688-744`, `ResultsPanel.tsx:165-192`, `LandingPage.tsx:175-212`

Abas usam fundo branco 8% + ring; seletor de tema usa o mesmo; cards de formato usam borda âmbar + check; densidade usa ícone âmbar sobre branco 9%; chips usam outra combinação. São cinco padrões para "isto está ativo".

**Recomendação**

- Definir dois padrões e reutilizá-los:
  - **Segmented control** para escolhas exclusivas compactas (tabs, tema, densidade, filtros).
  - **Option card** para escolhas com ícone/descrição (viewport, formato, presets).
- Estados: default, hover, focus-visible, selected, disabled, loading. Documentar no design system.
- Não usar apenas cor para indicar seleção; incluir check, peso ou posição.

---

### VIS-05 · Empty state ocupa muito espaço e mistura elementos decorativos com acionáveis

**Severidade:** P2 · **Esforço:** P · **Onde:** `ResultsPanel.tsx:461-560`, `App.tsx:636-639`

A área tracejada de ~780 px centraliza um conteúdo útil, mas os chips "WebP / PDF / PNG / JPG" parecem filtros clicáveis e não são; "Capturar links de exemplo" executa uma captura real e substitui a lista digitada; e a lista padrão já vem preenchida, então o usuário nunca vê um vazio de verdade.

**Recomendação**

- Primeiro uso: campos com **placeholder**, não valores reais; URLs de exemplo entram por ação explícita "Adicionar 3 exemplos" e não sobrescrevem o que existe.
- Transformar os chips de formato em legenda (`Disponível em: WebP, PDF, PNG, JPG`) sem aparência de botão, ou em seletor real de formato que sincroniza com a aba Saída.
- Reduzir a altura mínima do bloco e alinhá-lo ao topo do canvas em telas baixas; em mobile, usar o espaço para a fila.
- Deixar claro que exemplos fazem requisições de rede reais: "Testa com 3 sites públicos de exemplo".

---

## 5. Responsividade e mobile

### ~~RESP-01 · Inspetor inacessível abaixo de 1536 px~~ **✅ Concluído**

> **Implementado em 06/11/2026.** O inspetor agora é persistente a partir de **1280 px** (`xl`) e vira **drawer lateral** abaixo disso, com backdrop, `role="dialog"`, `aria-modal`, focus trap, fechamento por Esc e restauração de foco no trigger. O acesso em telas menores foi movido para a toolbar do canvas (botão **Detalhes**); acima de 1280 px cada painel tem seu próprio controle de recolher/expandir. O drawer abre por teclado, mouse e toque. Testado em 390, 1024, 1440 e 1920 px, sem overflow horizontal. **Pendente:** largura redimensionável e abertura automática ao selecionar card em tablets.

**Severidade:** P1 · **Esforço:** M · **Onde (estado anterior):** `App.tsx:805-833`, `TopBar.tsx:116-129`, `Inspector.tsx:654-704`

O inspetor persistente é renderizado somente com `2xl:flex`; o rail também só aparece em `2xl`; o toggle da topbar é `hidden ... 2xl:inline-flex`. Em um MacBook de 13" (1440 px), Surface (1366 px) ou iPad landscape (1180 px), **não há como abrir o inspetor**, nem por teclado nem por toque. O responsivo "esconde" uma função inteira em vez de adaptá-la.

**Recomendação**

- **≥ 1280 px:** inspetor persistente (304–340 px), com largura redimensionável.
- **1024–1279 px:** inspetor em **drawer lateral direito** sobre o canvas, aberto pelo toggle da topbar e ao selecionar um card; backdrop, `role="dialog"`, `aria-modal="true"`, focus trap e fechamento com Esc.
- **< 1024 px:** acesso por ação "Detalhes" no card e/ou bottom sheet; não depender de hover.
- Manter o estado de colapso por breakpoint e restaurar o foco ao trigger ao fechar.
- O toggle deve estar visível sempre que o inspetor existir; usar `aria-expanded` + `aria-controls`.

**Aceite:** em 1024, 1280, 1366 e 1440 px, o inspetor abre por toque e por teclado, fecha com Esc, não deixa foco no conteúdo de trás e não causa scroll horizontal.

---

### RESP-02 · A toolbar mobile esconde ações essenciais e cria nomes acessíveis ruins

**Severidade:** P1 · **Esforço:** P · **Onde:** `ResultsPanel.tsx:194-234`, `TopBar.tsx:173-200`

No mobile, o texto "Baixar .zip" é `hidden sm:inline` e sobra apenas o número de arquivos. O botão passa a ter nome acessível "3"; "Limpar" também some e o "Capturar" da topbar esconde o texto, deixando o contador como conteúdo. Filtros e densidade ficam ocultos abaixo de `md`/`lg`.

**Recomendação**

- Nunca esconder o rótulo sem fornecer `aria-label` explícito; marcar o contador com `aria-hidden="true"`.
  - `aria-label={"Baixar ZIP com " + validItems.length + " arquivos"}`
  - `aria-label="Limpar galeria"`
  - `aria-label={"Capturar " + urlCount + " links"}`
- Manter ZIP visível (ícone + contador) e mover "Limpar", densidade e ordenação para um menu "…".
- Filtros de status devem virar **chips sempre visíveis** abaixo da toolbar em telas pequenas, com contagem (`Todas 10 · Prontas 8 · Falhas 2`), em vez de sumir.
- Adicionar safe-area inset no rodapé (`env(safe-area-inset-bottom)`) para iPhones.

**Aceite:** em 390×844, todas as ações da galeria são alcançáveis sem hover; leitor de tela anuncia nomes completos; nenhuma ação essencial fica atrás de breakpoint.

---

### RESP-03 · O grid pode estourar horizontalmente em 320 px

**Severidade:** P1 · **Esforço:** PP · **Onde:** `ResultsPanel.tsx:283-291`

`minmax(310px, 1fr)` com `px-3` exige 334 px; em viewport de 320 px a faixa mínima ultrapassa o container e o overflow horizontal é cortado pelo `overflow-x: hidden` do body.

**Correção**

```tsx
// antes
'grid-cols-[repeat(auto-fill,minmax(310px,1fr))]'
// depois
'grid-cols-[repeat(auto-fill,minmax(min(100%,310px),1fr))]'
```

Aplicar também ao modo compacto (`250px`) e revisar `max-w-[1680px]` com padding.

**Aceite:** teste em 320×568 e 360×640 sem scroll horizontal; cards ocupam 100% da largura útil.

---

### RESP-04 · Alvos de toque pequenos e inputs que provocam zoom no iOS

**Severidade:** P1 · **Esforço:** P · **Onde:** `ResultsPanel.tsx:630-638`, `TopBar.tsx:102-129`, `PreviewDialog.tsx:146-185`, `ConfigPanel.tsx:364, 494, 802`

Muitos controles têm 28–36 px (WCAG 2.5.8 recomenda 24 px mínimos e boas práticas pedem 44 px em toque). O botão de remover tem `h-5 w-5` (20 px). Inputs com 12,5–14,5 px disparam zoom automático no Safari iOS (mínimo 16 px).

**Recomendação**

- Aumentar a área de toque sem alterar o ícone: padding invisível ou `min-h-11 min-w-11` em `@media (pointer: coarse)`; manter densidade no desktop.
- Remover affordances exclusivas de hover em toque: ações do card sempre visíveis ou acessíveis por menu.
- Inputs e textareas com `font-size: 16px` no mobile (media query), mantendo 13–14 px no desktop.
- Testar em 390×844 e landscape; validar alvos com o Chrome DevTools "Emulate touch".

**Aceite:** todos os controles interativos têm área ≥44×44 CSS px em toque; nenhuma ação depende de hover; iOS não amplia ao focar campos.

---

### RESP-05 · Painéis com largura fixa e sem redimensionamento

**Severidade:** P2 · **Esforço:** M · **Onde:** `App.tsx:755-775`, `Inspector.tsx:84-87`

Configuração fixa em 348 px e inspetor em 304 px. Em telas grandes, o usuário não consegue priorizar o canvas; em telas médias, o canvas fica estreito sem alternativa.

**Recomendação**

- Handles de arraste nas bordas dos painéis, com larguras mínima/máxima, persistência e duplo clique para resetar.
- Colapsar a configuração por padrão abaixo de 1280 px (o drawer resolve o mobile).
- Lembrar largura por painel em `localStorage` com versão de schema.

---

### RESP-06 · Detalhes de viewport e teclado virtual

**Severidade:** P2 · **Esforço:** P · **Onde:** `App.tsx:693`, `ResultsPanel.tsx:323-339`

`h-dvh` é uma boa escolha. Faltam ajustes para teclado virtual (quando o textarea de URLs abre, o rodapé com CTA pode ficar sob o teclado), landscape curto e safe areas.

**Recomendação**

- No drawer mobile, usar `max-height: 100dvh` e `padding-bottom: env(safe-area-inset-bottom)`; garantir que o CTA fique visível com o teclado aberto (`visualViewport` ou `scrollIntoView`).
- Testar 844×390 em landscape e 667×375 (iPhone SE).
- Evitar `position: fixed` para o drawer se o teclado alterar o viewport; considerar `position: absolute` dentro do shell.

---

### RESP-07 · O drawer de configuração não é um diálogo acessível

**Severidade:** P1 · **Esforço:** P · **Onde:** `App.tsx:712-739`

No mobile, o painel é um `<aside>` sobreposto, com backdrop implementado como botão em tela cheia. Não há `role="dialog"`, `aria-modal`, focus trap, `inert` no conteúdo de trás nem restauração de foco. O botão de backdrop entra na ordem de tabulação antes do conteúdo e é anunciado como "Fechar configuração" em tamanho de tela inteira.

**Recomendação**

- Reutilizar o padrão de `PreviewDialog`: `role="dialog"`, `aria-modal="true"`, `aria-labelledby`, `useFocusTrap`, Esc, foco inicial no botão de fechar, restauração no trigger.
- Backdrop como `<div aria-hidden="true" onClick={...}>` com `tabIndex={-1}`; ou `<button>` com `aria-label` apenas se for o único meio de fechar — o ideal é ter o X no header.
- Aplicar `inert` (ou `aria-hidden`) ao `main`/topbar enquanto o drawer estiver aberto, se a compatibilidade permitir; caso contrário, o focus trap resolve.
- Bloquear scroll do body (o shell já é `h-dvh`, mas validar).

**Aceite:** navegação por Tab fica contida no drawer; Esc fecha; foco volta ao botão que abriu; leitor de tela anuncia "Painel de configuração, diálogo".

---

## 6. Acessibilidade

### ~~A11Y-01 · Contraste insuficiente em textos pequenos~~ **✅ Concluído**

> **Implementado em 06/11/2026.** Todos os `text-slate-500` e `text-slate-600` de texto — e os `placeholder:text-slate-600` — foram migrados para `text-slate-400` (**7,7:1** sobre o canvas e **7,5:1** nos cards). A varredura do DOM em 1440 px não encontrou nenhum texto usando as cores antigas; `text-slate-700` permanece apenas em separadores decorativos (`·`) e no chevron do breadcrumb. **Pendente como evolução:** consolidar em tokens semânticos e rodar axe-core formal (a validação desta rodada foi por computed styles).

**Severidade:** P0 · **Esforço:** P · **Onde (estado anterior):** `index.css:228-234`, uso extensivo de `text-slate-600`/`text-slate-500` em `ConfigPanel`, `ResultsPanel`, `Inspector`, `LandingPage`

Medições sobre `#070a11` (canvas) e `#080b12` (painel):

| Token | Hex | Contraste | Uso atual | Situação |
|---|---|---:|---|---|
| `slate-600` | `#475569` | **2,61:1** | hints, legendas, metadados 10,5–12 px | falha AA |
| `slate-500` | `#64748b` | **4,16:1** | textos secundários 11–14 px | falha AA (limite 4,5) |
| `slate-400` | `#94a3b8` | **7,72:1** | alguns textos | aprovado |
| `slate-300` | `#cbd5e1` | **13,34:1** | títulos/corpo | aprovado |
| âmbar | `#f5a623` | **9,77:1** | links/destaques | aprovado |

A WCAG 2.2 AA exige **4,5:1** para texto normal e **3:1** para texto grande (≥18,66 px bold ou ≥24 px). Placeholders também contam. Dezenas de textos informativos estão em 2,6–4,1:1, muitos com 10,5–12 px.

**Recomendação**

- Criar tokens semânticos e migrar:
  - `--text-primary: #e6edf6`
  - `--text-secondary: #cbd5e1` (13,3:1)
  - `--text-tertiary: #94a3b8` (7,7:1)
  - `--text-muted: #7c8ba1` (usar apenas em elementos grandes/decorativos; validar >4,5)
- Proibir `text-slate-600` para texto; reservar para bordas/ícones decorativos. `slate-500` apenas em texto ≥18,66 px bold ou ≥24 px.
- Placeholders (`placeholder:text-slate-600`) passam para `slate-400`.
- Chips e metadados em `text-slate-300` ou `slate-400`.
- Medir novamente com axe e com amostragem manual em `#0a0e16` (cards).

**Aceite:** axe-core sem violações `color-contrast`; todos os textos informativos ≥4,5:1; indicadores de foco e bordas de controles ≥3:1; verificação manual em pelo menos 12 componentes.

---

### ~~A11Y-02 · Ação de remover invisível para teclado~~ **✅ Concluído**

> **Implementado em 06/11/2026.** O botão de remover agora fica invisível apenas em dispositivos com hover (`[@media(hover:hover)]`); em toque permanece sempre visível. Com foco de teclado, `focus-visible` e `group-focus-within` elevam a opacidade para 1 e aplicam fundo/texto de destaque. A área de toque foi para 24×24 px. Testado por Tab (opacidade 1 e `:focus-visible`) e em emulação touch a 390 px (opacidade 1).

**Severidade:** P1 · **Esforço:** PP · **Onde (estado anterior):** `ResultsPanel.tsx:630-638`

O botão de remover do card tem `opacity-100 sm:opacity-0 sm:group-hover:opacity-100`. Em desktop, usuários de teclado tabulam até um controle invisível; o foco não revela o botão.

**Correção**

```tsx
className={cn(
  '... opacity-100 transition-opacity',
  '[@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100',
  'focus-visible:opacity-100 group-focus-within:opacity-100'
)}
```

Aplicar o mesmo padrão a overlays de ação sobre a thumbnail e a qualquer affordance `group-hover` que contenha controle.

**Aceite:** percorrendo o card apenas com Tab, o botão de remover fica visível ao receber foco; leitor de tela anuncia "Remover captura de host".

---

### A11Y-03 · Toasts e região viva: erros somem e o anúncio é ruidoso

**Severidade:** P1 · **Esforço:** P · **Onde:** `ui.tsx:124-163`, `App.tsx:161-169`, `ResultsPanel.tsx:103-111`

Todos os toasts vivem em um container `aria-live="polite"` e desaparecem em 4,5 s, inclusive erros. A região viva do canvas reanuncia uma frase inteira (`aria-atomic="true"`) a cada avanço de item, competindo com os toasts.

**Recomendação**

- Erros: `role="alert"` (assertivo), **persistentes** até dismiss ou ação; incluir botão "Tentar novamente"/"Detalhes". Sucessos: `role="status"`, 6–8 s, pausar timer em hover/focus.
- Container sem `aria-live` global; cada toast declara seu próprio `role`/`aria-live` para evitar anúncio duplicado.
- Região viva do canvas: anunciar apenas marcos (início, cada captura concluída, fim, falha), não cada `item_step`; remover `aria-atomic` ou trocar para um resumo compacto.
- Adicionar `aria-valuetext` na barra de progresso: `"3 de 10 capturas concluídas"`.
- Deduplicar toasts idênticos e limitar a 3.

**Aceite:** com NVDA/VoiceOver, o usuário ouve um anúncio claro por captura concluída, erros permanecem legíveis e nenhuma mensagem é repetida em dois canais.

---

### A11Y-04 · Semântica dos toggles de painel e da região do canvas

**Severidade:** P1 · **Esforço:** P · **Onde:** `TopBar.tsx:102-129`, `App.tsx:777-803`, `ResultsPanel.tsx:239`

Os toggles usam `aria-pressed={!isConfigCollapsed}`: o estado "pressionado" significa "expandido", mas o rótulo alterna entre "Expandir" e "Retrair" — combinação confusa. O botão do inspetor só existia em `2xl`; isso foi corrigido na RESP-01 (o toggle agora é global). O canvas é uma `div` com `overflow-y-auto` que não recebe foco, então PageDown/arrow keys podem não rolar a região.

**Recomendação**

- Usar `aria-expanded={!collapsed}` + `aria-controls="config-panel"` em vez de `aria-pressed` para painéis expansíveis; o nome acessível não deve mudar com o estado (ex.: "Painel de configuração"), e o estado fica no `aria-expanded`.
- `main id="workspace-main"` com `tabIndex={-1}` para receber foco na troca de view.
- Canvas: `role="region" aria-label="Capturas" tabIndex={0}` com instrução visível de atalhos; garantir que a rolagem por teclado funcione.
- Skip link no topo: "Pular para as capturas" → `#canvas`, visível no foco.
- `aria-busy={isRunning}` no grid e `aria-live` apenas para o resumo.

**Aceite:** navegação completa por teclado sem rato; ordem de tabulação lógica (topbar → configuração → canvas → inspetor); PageDown rola o canvas quando ele tem foco.

---

### A11Y-05 · Landing page: FAQ, tabela e mock sem suporte a leitor de tela

**Severidade:** P2 · **Esforço:** P · **Onde:** `LandingPage.tsx:160-334, 518-595, 659-700`

- FAQ não expõe `aria-expanded`/`aria-controls` nem região associada; o acordeão é apenas um botão que troca conteúdo.
- Tabela comparativa sem `<caption>` e sem `scope` nos cabeçalhos.
- O "cockpit" é conteúdo fictício (pipeline, 3180 ms, 48 imagens) lido por leitores de tela como se fosse real; os botões de device não têm estado (`aria-pressed`).
- Nav sem `aria-label` próprio; falta skip link na landing.

**Recomendação**

- FAQ: `aria-expanded`, `aria-controls`, `<div role="region" aria-labelledby=...>`; animação suave opcional respeitando reduced-motion.
- Tabela: `<caption class="sr-only">Comparativo...`; `scope="col"` e `scope="row"`.
- Marcar o mock como `aria-hidden="true"` e fornecer uma descrição `sr-only` do que ele ilustra; tornar os device buttons `aria-pressed` e fazer o mock realmente reagir (ver LAND-02).
- `<nav aria-label="Seções da página">`; skip link.

**Aceite:** axe sem violações sérias na landing; leitor de tela não anuncia telemetria fictícia como conteúdo do produto.

---

### A11Y-06 · Foco, zoom e alto contraste

**Severidade:** P2 · **Esforço:** P · **Onde:** `index.css:42-45`, `PreviewDialog.tsx`, `ResultsPanel.tsx`

O outline global âmbar de 2 px funciona na maioria dos casos, mas sobre botões âmbar tem pouco contraste; em alto contraste do Windows, cores translúcidas podem desaparecer. Zoom de 200–400% não foi validado.

**Recomendação**

- Anel de foco em duas camadas: `box-shadow: 0 0 0 2px #05070c, 0 0 0 4px #fde68a` (ou branco) para garantir 3:1 contra qualquer fundo.
- Testar em `forced-colors: active`; usar `forced-color-adjust` quando necessário e manter bordas visíveis.
- Validar reflow em 320 CSS px / 400% de zoom (WCAG 1.4.10); a landing pode rolar horizontalmente só na tabela, com container focável e indicador de rolagem.
- Não depender de blur/backdrop para legibilidade; garantir fundo sólido por baixo de textos pequenos.

---

### A11Y-07 · Tooltips nativos (`title`) não são confiáveis

**Severidade:** P2 · **Esforço:** P · **Onde:** vários `title=` em `TopBar`, `ConfigPanel`, `ResultsPanel`, `Inspector`

`title` tem atraso, não aparece no foco de teclado de forma consistente, não é estilizável e não funciona bem em toque. Muitas informações essenciais estão apenas nele (ex.: tokens de nomenclatura, nome do arquivo completo).

**Recomendação**

- Criar um primitivo `Tooltip` acessível: abre com hover **e** foco, fecha com Esc, usa `aria-describedby`, delay de 300 ms, posicionamento com colisão.
- Nunca colocar informação essencial apenas em tooltip; duplicar em texto visível ou em um painel de ajuda.
- Para ícones, manter `aria-label` + tooltip visual; o tooltip não substitui o nome acessível.

---

## 7. Formulários e prevenção de erros

### ~~FORM-01 · Colisão de nomes no ZIP e data em UTC~~ **✅ Concluído**

> **Implementado em 06/11/2026.** A nomenclatura foi simplificada: a data agora é local no cliente (`src/lib/snapper.ts`) e no servidor (`server.ts`); o ZIP do servidor aplica sufixo de unicidade (`nome-2.ext`) e o filtro de download sanitiza o nome; cada captura pode ser renomeada no canvas antes de baixar, por um diálogo aberto pelo nome do arquivo no card ou pelo lápis no inspetor. O download individual e o ZIP usam o nome editado. **Pendente como follow-up:** testes unitários dedicados para colisão/virada de dia.

**Severidade:** P0 · **Esforço:** P · **Onde (estado anterior):** `src/lib/snapper.ts:316-335`, `server.ts:97-140`, `server.ts:1358, 1374`, `App.tsx:560-567`

Dois problemas silenciosos:

1. **Sobrescrita:** `JSZip.file(name, ...)` substitui a entrada anterior quando o nome se repete. Se o padrão for `[data]`, `[formato]` ou um `[url]` que colide após truncamento de 60 caracteres, o ZIP final terá **menos arquivos** que o lote — sem aviso.
2. **Data errada:** `now.toISOString().slice(0, 10)` usa UTC. No Brasil (UTC−3), capturas após 21h recebem a data do dia seguinte; `[hora]` usa horário local, então o mesmo nome mistura dois fusos.

**Recomendação**

- Gerar data local de forma explícita no cliente e no servidor (ou receber a data local do cliente no payload), com `getFullYear/getMonth/getDate`; documentar o fuso no tooltip do token.
- Validar o padrão no cliente: destacar tokens desconhecidos, avisar quando não houver `[ordem]`, `[url]`, `[hora]` ou combinação que garanta unicidade, e mostrar uma prévia dos 3 primeiros nomes da fila.
- Aplicar sufixo de unicidade (`-2`, `-3`) em ambos os geradores (cliente e ZIP do servidor), com um `Set` de nomes já usados.
- Exibir a contagem de arquivos do ZIP e alertar se for menor que o número de capturas.
- Adicionar testes unitários para colisão, truncamento, UTF-8, acentos e virada de dia.

**Aceite:** um lote com padrão `[data]` gera N entradas únicas no ZIP; captura às 22h em America/Recife recebe a data local correta; nenhum arquivo é sobrescrito; existe teste automatizado cobrindo ambos.

---

### ~~FORM-02 · Ações destrutivas inconsistentes e sem desfazer~~ **✅ Concluído**

> **Implementado em 06/11/2026.** Remover captura, limpar a lista de URLs e limpar a galeria agora usam toast de **Desfazer** por 10 s, com snapshot em memória; o padrão de confirmação em dois cliques foi removido. "Adicionar links de exemplo" passou a fazer *append* com deduplicação, preserva as URLs digitadas e não dispara captura automaticamente. O toast ganhou ação acessível.

**Severidade:** P0 · **Esforço:** P · **Onde (estado anterior):** `ConfigPanel.tsx:405-413`, `App.tsx:618-639`, `ResultsPanel.tsx:630-638`, `App.tsx:636-639`

- "Limpar lista" apaga o textarea imediatamente.
- "Limpar galeria" tem confirmação em dois cliques com timeout de 3,5 s, mas **sem desfazer**.
- Remover um card é imediato.
- "Capturar links de exemplo" **substitui** silenciosamente as URLs digitadas e dispara capturas.

O usuário aprende três padrões diferentes para ações parecidas e pode perder trabalho.

**Recomendação**

- Padronizar:
  - **Reversível:** desfazer via toast com ação ("Galeria limpa · Desfazer"), 10 s, snapshot em memória.
  - **Irreversível/bulk:** diálogo de confirmação com contagem e consequência ("Remover 12 capturas? Os arquivos não poderão ser recuperados.").
  - **Exemplos:** "Adicionar 3 exemplos" (append, sem sobrescrever); se a lista já tiver URLs, perguntar "Adicionar ou substituir?".
- Rótulo de confirmação explícito: "Confirmar exclusão" em vez de "Confirmar".
- Desabilitar ações durante execução já é feito; manter e explicar o motivo em tooltip.
- Para remover item individual, preferir **desfazer** em vez de confirmar (menos atrito).

**Aceite:** é possível desfazer a remoção de um card, a limpeza da lista e a limpeza da galeria; exemplos nunca destroem URLs sem consentimento; teste de teclado/leitor de tela anuncia a ação e a reversão.

---

### FORM-03 · Falta de pré-voo para lotes caros

**Severidade:** P1 · **Esforço:** M · **Onde:** `App.tsx:219-485`, `ConfigPanel.tsx:287-312`

Com 50 URLs em 4K/full-page, o lote pode durar muito e consumir memória significativa. O usuário só descobre isso depois de iniciar. Não há estimativa de tempo, tamanho ou memória, nem resumo do que será feito.

**Recomendação**

- Antes de iniciar, quando `urls.length ≥ 5` ou viewport ≥ 4K ou full-page, abrir um **resumo de pré-voo** não bloqueante:
  - `50 links · WebP 85% · 3840×2160 full-page · tema sistema`
  - `Estimativa: ~9 min · ~420 MB em memória` (baseada na média do último lote; rotular "aproximado")
  - Alertas: duplicadas, URLs inválidas, páginas muito longas, limite de 50.
  - Ações: `Revisar fila` · `Capturar` (primário) · `Não mostrar novamente` (persistido).
- Para lotes pequenos (1–4 URLs), não interromper o fluxo.
- Exibir estimativa de memória no inspetor enquanto configuram resolução: `w × h × 4 bytes` por imagem decodificada, com aviso a partir de um orçamento definido (ex.: 1,5 GB).

**Aceite:** usuário consegue cancelar antes de iniciar; estimativas aparecem rotuladas como aproximadas; a preferência "não mostrar" é respeitada; nenhum clique extra para lotes pequenos.

---

### FORM-04 · Entrada de URLs rígida e sem validação por linha

**Severidade:** P1 · **Esforço:** M · **Onde:** `ConfigPanel.tsx:321-440`, `snapper.ts:244-249`

`parseUrls` divide apenas por `\n`. Colar uma lista separada por vírgulas, tabs ou espaços gera uma linha inválida; não há indicação de URL malformada, importação de arquivo, reordenação, histórico estruturado ou opção de ignorar duplicadas.

**Recomendação**

- Aceitar colagem com múltiplos separadores (linhas, vírgulas, tabs, espaços) com normalização e confirmação visual; preservar query strings.
- Validação por linha: ícone de erro + motivo (`domínio inválido`, `protocolo não suportado`), sem bloquear URLs locais (`localhost:3000`, IPs, `file:` se suportado) — o produto já se posiciona como local-first.
- Importar `.txt`/`.csv` por botão e drag-and-drop; exportar a fila.
- Toggle "Ignorar duplicadas ao capturar"; ação "Manter primeiras 50" quando exceder o limite.
- Histórico de filas recentes (com data e contagem), com "restaurar".
- Modo lista opcional (tabela com host, path, status), mantendo o textarea como modo avançado.
- Aplicar `inputMode="url"`, `autoCapitalize="none"`, `autoCorrect="off"` (já presentes) e contador de linhas válidas/inválidas.

**Aceite:** colar `a.com, b.com, c.com` produz 3 URLs; linha inválida é destacada e impedida de iniciar; importação de arquivo funciona; duplicadas podem ser ignoradas com um clique.

---

### FORM-05 · Campos de dimensão silenciam valores inválidos

**Severidade:** P1 · **Esforço:** P · **Onde:** `ConfigPanel.tsx:443-500`

`DimensionField` só chama `onChange` quando o valor está dentro do intervalo; ao sair do campo, faz `clamp` sem mensagem. O usuário digita 9000, o campo volta para 7680 sem explicar por quê. Não há troca de largura/altura, proporção bloqueada ou mensagem de erro.

**Recomendação**

- Exibir mensagem inline: "Largura máxima: 7680 px".
- Adicionar steppers `−`/`+` e botão de inverter (`↔`) largura/altura.
- Permitir trava de proporção opcional para presets customizados.
- Mostrar o preset aplicado e um atalho "Restaurar preset Full HD".
- Ao escolher um preset, manter foco e anunciar a mudança (aria-live curto).

---

### FORM-06 · Credenciais em texto puro no `localStorage`

**Severidade:** P1 · **Esforço:** P · **Onde:** `ConfigPanel.tsx:990-1059`, `usePersistentState.ts:22-28`, `App.tsx:85-96`

Headers e cookies (potenciais tokens de produção) são persistidos em texto puro e ficam visíveis na aba Avançado. A UI avisa que ficam no navegador, mas não oferece mascaramento, limpeza rápida ou opção de não persistir.

**Recomendação**

- Default: **não persistir credenciais**; checkbox "Lembrar nesta sessão" (sessionStorage) e "Lembrar neste navegador" (localStorage) com aviso explícito.
- Mascarar valores por padrão com botão "mostrar"; botão "Limpar credenciais" no header da seção.
- Nunca incluir credenciais em exportações, logs, toasts ou mensagens de erro.
- Exibir selo de risco quando headers/cookies estiverem configurados e o app estiver em produção.
- Considerar `autocomplete="off"` e `spellCheck={false}` (já presente).

**Aceite:** ao fechar o navegador, credenciais não persistem sem opt-in; é possível limpar em um clique; capturas não vazam headers para o ZIP/metadados.

---

### FORM-07 · Reset global sem confirmação nem undo

**Severidade:** P2 · **Esforço:** P · **Onde:** `ConfigPanel.tsx:169-178`, `App.tsx:631-634`

O botão de reset restaura tudo de uma vez e só informa depois, via toast. Não há reset por aba nem desfazer.

**Recomendação**

- Reset por seção (Links, Viewport, Saída, Avançado) com "Restaurar padrão" dentro de um menu.
- Após reset, toast com "Desfazer" e snapshot das configurações anteriores.
- Não resetar credenciais junto com preferências visuais por padrão; tratar como categoria separada.

---

### FORM-08 · Interromper o lote é imediato e binário

**Severidade:** P2 · **Esforço:** P · **Onde:** `App.tsx:491-499`, `TopBar.tsx:173-200`, `ConfigPanel.tsx:287-312`

"Interromper" aborta o `fetch` na hora. Em um lote de 40 páginas, o usuário pode querer terminar a captura atual antes de parar; não há essa opção nem confirmação.

**Recomendação**

- Menu no botão de interromper com: **"Parar após esta captura"** e **"Interromper agora"**.
- Para lotes grandes, confirmar "Interromper? 23 capturas ainda serão ignoradas." com opção de continuar.
- Manter o botão vermelho, mas com affordance de menu (chevron) para não parecer destrutivo por acidente.

---

### FORM-09 · Slider de qualidade sem referência

**Severidade:** P2 · **Esforço:** P · **Onde:** `ConfigPanel.tsx:747-778`

O slider de 20–100 tem apenas o valor numérico e uma frase genérica. O usuário não sabe o impacto em peso/qualidade antes de capturar.

**Recomendação**

- Marcas em 40/60/85/100 com rótulos "leve", "equilibrado", "recomendado", "máximo".
- Estimativa de peso quando houver uma captura anterior em memória ("~180 KB nesta resolução") ou após o primeiro item.
- Presets rápidos: "Web (75)", "Equilibrado (85)", "Arquivo (95)".
- Manter `aria-valuetext` com a descrição do preset.

---

### FORM-10 · Falta biblioteca de presets salvos

**Severidade:** P2 · **Esforço:** M · **Onde:** `ConfigPanel.tsx:502-855`

Quem repete o mesmo fluxo (ex.: "QA mobile 390×844, PNG, tema claro, sem cookies") reconfigura toda vez. Só existe o reset para o padrão.

**Recomendação**

- "Salvar preset" com nome, descrição e miniatura dos principais parâmetros; aplicar em um clique.
- Presets embutidos por caso de uso: "Auditoria desktop", "QA mobile", "Arquivamento PDF", "Documentação 4K".
- Import/export JSON para compartilhar com o time; versionar o schema.
- Indicar quando a configuração atual divergir do preset aplicado ("modificado").

---

## 8. Feedback e estados

### ~~FB-01 · Tela vazia durante a captura inicial~~ **✅ Concluído**

> **Implementado em 06/11/2026.** Ao iniciar o lote, o canvas é semeado com um card por URL em estado `pending`. Cada card evolui para `processing` (com a fase atual), `success` (vira artboard com thumbnail) ou `error`; interrupções convertem os itens restantes em falhas explícitas, sem deixar cards presos em "na fila". O cabeçalho e o rodapé mostram contagem de capturas e de itens na fila; o inspetor ganhou um estado dedicado para URLs pendentes. A altura do card de fila foi alinhada ao card final para reduzir salto de layout. Testado com 2 URLs e com interrupção no meio do lote.

**Severidade:** P1 · **Esforço:** M · **Onde (estado anterior):** `ResultsPanel.tsx:252-260, 562-586`, `App.tsx:305-352`

Até o primeiro `item_success`, o canvas mostra apenas um skeleton genérico de 3 cards. Em lotes longos, não há noção de progresso por URL, e o skeleton não corresponde à quantidade real.

**Recomendação**

- Seguir IA-04: cards pendentes reais por URL.
- Enquanto a fila não estiver implementada, ao menos mostrar `SkeletonCanvas count={Math.min(urls.length, 6)}` com a etiqueta "0 de N · preparando a primeira captura".
- Adicionar um botão "Ver fila" no banner de progresso que abre a lista de URLs com status.

---

### FB-02 · As fases do motor usam jargão interno

**Severidade:** P1 · **Esforço:** P · **Onde:** `snapper.ts:350-369`, `ResultsPanel.tsx:381-383`

"Hero settling", "hidratando DOM", "textura estabilizando" são termos do pipeline, não da tarefa. Para um designer ou auditor, isso não responde "o que está acontecendo com a minha página?".

**Recomendação**

- Traduzir para linguagem de tarefa:
  - `loading` → "Abrindo a página"
  - `hydrating` → "Carregando conteúdo dinâmico"
  - `hero_settling` → "Aguardando fontes e primeira dobra"
  - `texture_stabilizing` → "Ajustando fundos e parallax"
  - `scrolling` → "Percorrendo a página"
  - `decoding` → "Carregando imagens"
  - `settling` → "Finalizando detalhes"
  - `capturing` → "Gerando o arquivo"
- Manter o termo técnico em tooltip/`data-step` para debug, sem poluir a interface.
- Mostrar uma linha do tempo de fases no card atual (pontos com check), não apenas o texto mutável.

---

### FB-03 · Recuperação de falhas limitada a um item por vez

**Severidade:** P1 · **Esforço:** P · **Onde:** `ResultsPanel.tsx:739-818`, `Inspector.tsx:350-405`, `App.tsx:501-506`

Falhas podem ser retentadas individualmente, mas não há "tentar todas", nem classificação do erro, nem cópia dos detalhes. Em um lote com 8 falhas, o usuário repete o ciclo 8 vezes.

**Recomendação**

- Ação "Tentar todas as falhas" no banner e na toolbar (com contagem), executando em sequência.
- Classificar o erro em categorias acionáveis: DNS/conexão, timeout, autenticação (401/403), página vazia, limite de tamanho, bloqueio de bot.
- Para cada categoria, uma dica e um atalho: "Ajustar headers", "Aumentar espera", "Capturar só viewport".
- Botão "Copiar detalhes" com URL, mensagem, data e configuração; útil para suporte.
- Preservar a posição do item na fila e o número de ordem ao retentar.

---

### FB-04 · Novas capturas podem aparecer fora da área visível

**Severidade:** P1 · **Esforço:** P · **Onde:** `ResultsPanel.tsx:239-318`, `App.tsx:322-323`

Os itens são adicionados ao final do grid; se o usuário estiver revisando o topo, não vê o progresso e pode achar que travou. Auto-scroll forçado seria agressivo; não há indicador de novidades.

**Recomendação**

- Aviso flutuante no canvas: "2 novas capturas · Ver" quando o usuário estiver longe do fim.
- Toggle "Acompanhar novas capturas" (padrão ligado no início do lote, desligado ao interagir com o canvas).
- Nunca mover o scroll enquanto o usuário interage com outro card.
- Animar a entrada do card apenas se `prefers-reduced-motion` permitir.

---

### FB-05 · Resumo final pobre para auditoria

**Severidade:** P2 · **Esforço:** P · **Onde:** `ResultsPanel.tsx:415-457`, `Inspector.tsx:437-462`

O banner final mostra contagem e duração, mas não taxa de sucesso, peso total, média por página ou caminho do arquivo. Para QA/auditoria, falta um artefato de registro.

**Recomendação**

- Resumo pós-lote: `N capturadas · M falhas · taxa · tempo total · média/página · peso total · formato · viewport`.
- Exportar **manifesto CSV/JSON** junto ao ZIP (URL, arquivo, dimensões, bytes, duração, status, erro, data/hora, configuração).
- Botão "Copiar resumo" e "Abrir pasta" (File System Access API quando disponível).
- Não é dashboard: manter em uma faixa/expansível, não ocupar o canvas.

---

### FB-06 · Sem sinal no título/notificação em lotes longos

**Severidade:** P2 · **Esforço:** P · **Onde:** `index.html:7`, `App.tsx:178-184`

Em uma captura de vários minutos, o usuário troca de aba e perde o progresso e a conclusão.

**Recomendação**

- Atualizar `document.title` para `(3/10) Capturando — Chromium Snapper` e `✓ 10 capturas — Chromium Snapper` ao final.
- Notificação opcional ao concluir (`Notification.requestPermission`), com opt-in; nunca automática.
- Badge de favicon com contagem (canvas) se barato; não essencial.

---

### FB-07 · Progresso do ZIP engana

> **Atualização 06/11/2026:** o progresso agora usa os bytes reais do `Content-Length` e o ZIP pode ser cancelado com `AbortController`; o percentual falso por arquivo foi removido. Falta validar um lote de 50 arquivos e o cancelamento do lado do servidor.

**Severidade:** P1 · **Esforço:** P · **Onde (estado anterior):** `App.tsx:552-595`, `ResultsPanel.tsx:194-216`

`zip.generateAsync` reporta percentual do ZIP; o código converte para "arquivos concluídos" (`Math.round(percent/100 * validItems.length)`). O rótulo "Compactando 2/3" sugere precisão por arquivo que não existe. Além disso, tudo roda na thread principal.

**Recomendação**

- Se mantiver JSZip no cliente: usar um **Web Worker**, reportar progresso em bytes/percentual ("Compactando 45%"), permitir cancelar e liberar memória após o download.
- Melhor: usar o endpoint existente `POST /api/screenshot/pack-zip` (`server.ts:1412`) para lotes grandes, com download em stream e `Content-Disposition`; evita duplicar base64 no navegador.
- Limitar o ZIP concorrente a um por vez (já feito via ref) e avisar sobre memória.
- Para arquivos grandes, oferecer "Salvar como…" via File System Access API.

**Aceite:** UI permanece responsiva durante a compactação; progresso corresponde ao trabalho real; cancelamento funciona; ZIP de 50 arquivos abre com todas as entradas.

---

### ~~FB-08 · Refresh, fechar aba ou sair descartam capturas sem aviso~~ **✅ Concluído**

> **Implementado em 06/11/2026.** A aplicação registra `beforeunload` enquanto houver capturas ou execução em andamento. O botão "Sair" abre um diálogo com **Baixar ZIP e sair**, **Sair sem baixar** e **Continuar no workspace**; o ZIP é gerado antes de trocar para a landing. A landing continua acessível e as capturas permanecem em memória enquanto a aba não for recarregada/fechada — o diálogo explicita exatamente isso.

**Severidade:** P0 · **Esforço:** P · **Onde (estado anterior):** `App.tsx:98-110, 601-616`

As capturas vivem apenas em memória (`useState<CapturedItem[]>`). Um F5, fechamento de aba, crash ou clique em "Sair" apaga tudo — inclusive um lote que levou minutos. Não há `beforeunload` em lugar nenhum.

**Recomendação**

- Registrar `beforeunload` quando `isRunning` ou `items.length > 0`:

```tsx
useEffect(() => {
  if (!isRunning && items.length === 0) return;
  const handler = (event: BeforeUnloadEvent) => {
    event.preventDefault();
    event.returnValue = '';
  };
  window.addEventListener('beforeunload', handler);
  return () => window.removeEventListener('beforeunload', handler);
}, [isRunning, items.length]);
```

- No botão "Sair" com capturas, abrir diálogo: **Baixar ZIP e sair**, **Sair sem baixar**, **Cancelar**. O ZIP pode ser gerado antes de trocar a view.
- Persistir metadados sem imagens (não é possível recuperar data URLs grandes em localStorage com segurança) e explicitar: "Capturas não são salvas automaticamente. Baixe antes de sair."
- Opcional: salvar automaticamente no disco via File System Access API quando o usuário escolher uma pasta de destino ("salvar cada captura automaticamente").
- Se o servidor cair no meio, manter os itens já recebidos e permitir retomar as URLs restantes (ver FB-03).

**Aceite:** fechar a aba com capturas ou em execução dispara aviso do navegador; "Sair" oferece baixar antes; nenhum caminho descarta capturas silenciosamente.

---

## 9. Galeria, canvas e produtividade

### GAL-01 · Sem busca, ordenação ou seleção múltipla em lotes de até 50

**Severidade:** P1 · **Esforço:** M · **Onde:** `ResultsPanel.tsx:113-236, 283-318`

A única forma de encontrar uma captura é rolar. Não há busca por domínio/URL/nome, ordenação, seleção em massa ou ações em lote (baixar selecionadas, remover selecionadas).

**Recomendação**

- Barra de busca acima do grid: filtra por host, path, nome do arquivo; atalho `/` para focar.
- Ordenação: recente, host A–Z, maior peso, maior altura, duração.
- Seleção múltipla: checkbox no hover/foco, Shift+clique para intervalo, `Ctrl/Cmd+A` na região, barra flutuante com "Baixar selecionadas", "ZIP selecionado", "Remover".
- Manter o filtro de status como segmented control com contagens.
- Persistir busca/ordenação/densidade por sessão (ou por usuário).
- Para 50+ itens, avaliar virtualização (PERF-07).

**Aceite:** encontrar uma URL específica em 50 itens leva <5 s; ações em lote funcionam com teclado; o estado vazio de busca é claro.

---

### GAL-02 · Excesso de ações por card

**Severidade:** P1 · **Esforço:** M · **Onde:** `ResultsPanel.tsx:607-737`

Cada card tem link externo, botão remover, duplo clique, "Ver", "Copiar" e "Baixar", além de uma dica de hover sobre a imagem. São muitas affordances concorrentes para uma tarefa simples (revisar e baixar). A dica "Duplo clique para ampliar" não existe em toque e o duplo clique não é descoberto por teclado.

**Recomendação**

- Hierarquia: **Abrir prévia** é a ação primária (clique na imagem ou botão "Abrir"); **Baixar** é secundária; copiar/remover/abrir site vão para um menu "…" ou aparecem no hover/foco da thumbnail.
- Remover o duplo clique como único caminho alternativo (manter como atalho, não como descoberta).
- No mobile, mostrar no máximo duas ações visíveis + menu.
- Aplicar seleção por clique único no card (sem abrir), com Enter para abrir, para consistência com apps de design.

**Aceite:** card com no máximo 2 botões visíveis + menu; todas as ações acessíveis por teclado e toque; nenhuma dica depende de hover.

---

### GAL-03 · Metadados com risco de "undefined" e baixa legibilidade

**Severidade:** P2 · **Esforço:** P · **Onde:** `ResultsPanel.tsx:686-703`, `Inspector.tsx:228-239`

`item.dimensions?.pageWidth` pode ser `undefined` e renderiza `undefined × undefined`; os metadados estão em 11 px e cores de baixo contraste. A duração de 0 ms vira "0s", aceitável, mas sem contexto.

**Recomendação**

- Helper `formatDimensions(item)` que retorna `—` quando ausente.
- Metadados em 12 px com `tabular-nums` e contraste mínimo `slate-400`.
- Exibir data quando o lote atravessar dias; usar `Intl.DateTimeFormat('pt-BR')`.
- Mostrar "falha" como chip explícito no card, não só a cor.

---

### GAL-04 · Densidade não persistida e rótulos de "grade" ambíguos

**Severidade:** P2 · **Esforço:** P · **Onde:** `ResultsPanel.tsx:92, 165-192`

"Grade ampla/compacta" muda apenas a largura mínima dos cards; não é uma grade do canvas. A escolha se perde ao recarregar.

**Recomendação**

- Renomear para "Cartões grandes"/"Cartões compactos" (ou "Confortável"/"Compacto") e persistir.
- Se houver modo canvas real no futuro (pan/zoom/grade), distinguir os conceitos.

---

### GAL-05 · Sem renomear/copiar nome do arquivo

**Severidade:** P2 · **Esforço:** P · **Onde:** `Inspector.tsx:241-246`, `ResultsPanel.tsx:621-626`

O nome é gerado no servidor; o usuário não pode renomear uma captura específica antes de baixar ou copiar o nome.

**Recomendação**

- Ação "Renomear" no menu do card, com validação de caracteres e colisão.
- "Copiar nome do arquivo" e "Copiar URL".
- Refletir o novo nome no ZIP e no download individual; manter o original no metadado.

---

## 10. Desempenho percebido e memória

### ~~PERF-01 · A imagem completa é transferida duas vezes e decodificada em cada thumbnail~~ **✅ Concluído**

> **Implementado em 06/11/2026.** O SSE agora envia apenas metadados + thumbnail WebP rasterizada em ~640 px (via `deviceScaleFactor` no Chromium, sem nova dependência); o arquivo completo fica em um store em memória por 30 min e é servido por `GET /api/captures/:batchId/:itemId` somente ao abrir a prévia, copiar ou baixar. O ZIP passou a ser gerado no servidor via `POST /api/captures/pack-zip`, com buffers já capturados e nomes únicos. O JSZip saiu do bundle do cliente (375 KB no build de verificação, contra ~453 KB). Evento SSE de teste com 1 captura: **~5 KB** em vez de carregar a imagem inteira.

**Severidade:** P0 · **Esforço:** G · **Onde (estado anterior):** `server.ts:1105-1164`, `App.tsx:307-320`, `ResultsPanel.tsx:820-842`, `Inspector.tsx:190-194`, `PreviewDialog.tsx:261-272`

No servidor, para imagens, `previewDataUrl = dataUrl` — ou seja, o mesmo base64 gigante é enviado duas vezes no evento `item_success` (campo `dataUrl` e `previewDataUrl`). No cliente, cada card usa `previewDataUrl || dataUrl` como `<img>`, então **a imagem full-page 4K é decodificada em tamanho natural para cada card**. Para PDF, o base64 do PDF inteiro também viaja no SSE. Em 20–50 páginas, o custo de rede, parse, memória e decodificação explode.

**Recomendação**

- **Separar thumbnail de arquivo final:**
  - SSE envia apenas metadados + uma thumbnail real (WebP, largura 480–640 px, qualidade ~60–70).
  - O arquivo final fica disponível por um endpoint autenticado/local (`GET /api/captures/:id`) e é baixado sob demanda ao abrir a prévia, copiar ou baixar.
  - No cliente, usar `Blob` + `URL.createObjectURL` e revogar ao remover/fechar; nunca manter base64 no estado para imagens grandes.
- Gerar thumbnails no servidor com `sharp` (ou equivalente) a partir do buffer já capturado; para PDF, thumbnail da primeira página/viewport.
- Se não for viável no backend agora: ao menos **não duplicar** `previewDataUrl` e gerar a thumbnail no cliente uma única vez (`createImageBitmap` + `OffscreenCanvas`), mantendo o arquivo em um `Blob` e não em data URL.
- Adicionar cabeçalhos `Content-Length`, `Cache-Control` e `Content-Disposition` no endpoint de arquivo.
- Evitar strings base64 no estado do React; strings grandes são copiadas e pressionam o GC.

**Aceite:** lote de 20 páginas 4K full-page conclui sem travar; heap permanece abaixo do orçamento definido (ex.: 1,5 GB); cada evento SSE < 100 KB; thumbnails nítidas; download individual, cópia e ZIP continuam funcionando; PDF não trafega base64 no SSE.

---

### ~~PERF-02 · ZIP na thread principal~~ **✅ Concluído**

> **Implementado em 06/11/2026.** A geração já ocorria no servidor desde a PERF-01; nesta rodada o cliente passou a ler a resposta em chunks, calcular o progresso pelos bytes reais (`Content-Length`) e cancelar com `AbortController`. Não há mais JSZip nem base64 no navegador. Em teste com throttling de 3 KB/s, o pill exibiu **77%** e o cancelamento mostrou o toast correspondente; o caminho de sucesso também gerou e baixou o ZIP. **Follow-up:** abortar também o trabalho no servidor e validar 50 arquivos.

**Severidade:** P1 · **Esforço:** M · **Onde (estado anterior):** `App.tsx:552-595`, `ResultsPanel.tsx:194-216`

---

### PERF-03 · Landing e workspace no mesmo bundle

**Severidade:** P1 · **Esforço:** P · **Onde:** `src/main.tsx:1-3`, `App.tsx:1-25`, `dist/assets/index-DlUjkBFv.js` (~453 KB)

A landing carrega o código do workspace e todos os componentes, mesmo antes do clique em "Abrir workspace". O bundle não é enorme, mas o primeiro contato pode ser mais leve. **Atualização 06/11/2026:** o JSZip já saiu do bundle do cliente; permanece o code splitting da rota/workspace.

**Recomendação**

- `React.lazy` para o workspace e para `PreviewDialog`/`Inspector`; `import('jszip')` apenas dentro de `handleZip`.
- Manter a landing como entry leve; prefetch do workspace no hover/foco do CTA.
- Medir e definir orçamento (ex.: ≤ 120 KB gzip para a rota inicial).
- Adicionar `Suspense` com skeleton coerente com a marca.

---

### PERF-04 · Todos os cards re-renderizam a cada evento de progresso

**Severidade:** P1 · **Esforço:** P · **Onde:** `App.tsx:100-105, 299-329`, `ResultsPanel.tsx:283-316`

`progress` muda a cada `item_step` e está no estado de `App`, que re-renderiza `ResultsPanel` e, por consequência, todos os `CaptureCard` (não memoizados). Com 50 cards e imagens, isso gera trabalho desnecessário no main thread durante a captura.

**Recomendação**

- `memo(CaptureCard)` e `memo(ErrorCard)` com props estáveis (callbacks já vêm de `useCallback` no App; verificar handlers inline).
- Isolar o banner de progresso em um componente que consome um contexto/seleção, para que apenas ele re-renderize por `item_step`; cards só mudam em `item_success`/`item_error`.
- Evitar recriar arrays/objetos por render (`visibleItems`, `totalBytes` são baratos; o custo está nos cards).
- Medir com React Profiler: < 2 ms por evento com 50 itens.

---

### ~~PERF-05 · Fontes carregadas de terceiros contradizem a proposta local~~ **✅ Concluído**

> **Implementado em 06/11/2026.** As dependências `@fontsource-variable/plus-jakarta-sans` e `@fontsource-variable/jetbrains-mono` foram adicionadas e importadas no entry; os links e preconnects do Google foram removidos. O bundle contém os arquivos woff2 e o navegador carrega apenas o subset necessário (`font-display: swap`). Verificação com Puppeteer: somente requests para `127.0.0.1:3000`, `document.fonts.status === 'loaded'`. **Follow-up:** preload dos dois arquivos latinos e medição formal de CLS.

**Severidade:** P1 · **Esforço:** P · **Onde (estado anterior):** `index.html:25-31`

O app busca Plus Jakarta Sans e JetBrains Mono em `fonts.googleapis.com`/`fonts.gstatic.com`. Isso (a) gera requisição a terceiros em um produto que promete "zero transmissão externa", (b) quebra uso offline/air-gapped e (c) adiciona latência/CLS.

**Recomendação**

- Auto-hospedar as fontes com `@fontsource-variable/plus-jakarta-sans` e `@fontsource-variable/jetbrains-mono`, subset latin-ext, `font-display: swap` e `size-adjust` para o fallback.
- `preload` apenas dos pesos usados; manter as duas famílias, mas reduzir variações.
- Remover `preconnect` para Google e atualizar a landing para refletir a realidade.
- Validar com Lighthouse e medir CLS < 0,05.

---

### PERF-06 · Memória acumulada entre execuções

**Severidade:** P2 · **Esforço:** P · **Onde:** `App.tsx:98, 322, 597-599`

`items` acumula capturas de vários lotes sem limite. Remover um item libera a referência, mas não há indicador de memória, limite ou limpeza automática; data URLs de lotes antigos continuam no heap.

**Recomendação**

- Estimar memória (`w × h × 4` por imagem decodificada + base64) e exibir no inspetor/status bar.
- Avisar ao ultrapassar um orçamento e oferecer "Baixar e limpar capturas antigas".
- Separar "resultados da execução atual" de "histórico" (metadados leves).
- Ao implementar Blob URLs (PERF-01), revogar em `remove`, `clear` e `unmount`.
- Limitar itens em memória (ex.: 50–100) com aviso; nunca truncar silenciosamente.

---

### PERF-07 · Virtualização para listas grandes

**Severidade:** P2 · **Esforço:** M · **Onde:** `ResultsPanel.tsx:283-316`

O grid renderiza todos os cards. Até 50 itens com thumbnails leves é aceitável; com imagens maiores e histórico, pode ficar pesado. Virtualizar só depois de PERF-01, para não otimizar o problema errado.

**Recomendação**

- `IntersectionObserver` para montar/desmontar cards fora da viewport ou uma lib leve de virtualização.
- Manter a semântica de lista/grid e o foco ao navegar por teclado.
- Medir INP e memória antes/depois.

---

## 11. Design system e consistência

### DS-01 · Tokens ausentes: cores, raios e tamanhos hardcoded

**Severidade:** P1 · **Esforço:** M · **Onde:** `index.css:3-9`, uso de `#05070c`, `#080b12`, `#0a0e16`, `#0c1119`, `rounded-[9px]`, `text-[9.5px]`, `text-[11.5px]`, etc.

A UI é visualmente coesa, mas a implementação depende de valores mágicos repetidos em dezenas de arquivos. Isso dificulta tema, contraste global, consistência e manutenção.

**Proposta de tokens**

```css
@theme {
  /* Superfícies */
  --color-canvas: #05070c;
  --color-surface-1: #080b12;
  --color-surface-2: #0a0e16;
  --color-surface-3: #0c1119;
  --color-surface-raised: #101622;

  /* Linhas */
  --color-line-subtle: rgba(148, 163, 184, 0.10);
  --color-line: rgba(148, 163, 184, 0.16);
  --color-line-strong: rgba(148, 163, 184, 0.26);

  /* Texto (contraste medido sobre surface-1) */
  --color-text-1: #e6edf6;   /* ~15:1 */
  --color-text-2: #cbd5e1;   /* 13,3:1 */
  --color-text-3: #94a3b8;   /* 7,7:1 */
  --color-text-muted: #7c8ba1; /* validar uso */

  /* Semântica */
  --color-accent: #f5a623;
  --color-accent-ink: #1b1305;
  --color-success: #34d399;
  --color-warning: #fbbf24;
  --color-danger: #fb7185;
  --color-info: #60a5fa;

  /* Raios */
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-xl: 20px;

  /* Tipografia */
  --text-2xs: 11px;
  --text-xs: 12px;
  --text-sm: 13px;
  --text-base: 14px;
  --text-md: 15px;
  --text-lg: 18px;
  --text-xl: 22px;
  --text-2xl: 28px;
}
```

- Migrar gradualmente; começar pelos pares de maior impacto (texto/fundo) e pelos componentes compartilhados.
- Adicionar regra de lint que barra hex fora de `index.css` e `text-[...]` arbitrários novos.
- Não criar um tema claro completo agora; o dark é identidade. Tokens permitem avaliar depois.

---

### DS-02 · Escala tipográfica inconsistente

**Severidade:** P1 · **Esforço:** P · **Onde:** todos os componentes

Há tamanhos 9,5 / 10,5 / 11 / 11,5 / 12 / 12,5 / 13 / 14 / 14,5 / 15 / 15,5 / 16 / 17,5 / 18,5 / 19,5 / 20 / 30 / 36 / 42 / 56 px. A diferença de 0,5 px entre níveis não é percebida e cria ruído de manutenção.

**Proposta**

| Papel | Tamanho | Peso / linha | Uso |
|---|---:|---|---|
| Micro-label | 11 px | 700, uppercase, tracking .14em | eyebrows, labels de seção (não usar para conteúdo) |
| Meta | 12 px | 500–600, 1.4 | chips, metadados, rodapés |
| Apoio | 13 px | 400–500, 1.55 | descrições, ajuda |
| Corpo/controle | 14 px | 500–600, 1.4 | botões, inputs, cards |
| Título de card | 15 px | 700, 1.25 | host, nome de captura |
| Título de seção | 18–22 px | 700 | painéis |
| Display | 28–36 px | 800, 1.1 | landing H2 |
| Hero | 40–56 px | 800, 1.05 | landing H1 |

- Mínimo de 12 px para texto informativo; 11 px apenas em uppercase decorativo com contraste ≥4,5.
- `font-variant-numeric: tabular-nums` em métricas, contadores e ETA.
- `text-wrap: balance` nos títulos da landing e `text-wrap: pretty` em parágrafos, se suportado.

---

### DS-03 · Inventário de componentes e documentação

**Severidade:** P2 · **Esforço:** M

Já existem primitivos em `ui.tsx` (Botão via classes, Ícone-botão, Switch, Toast, Spinner, Kbd), mas não há um inventário formal de estados. Sugestão:

- Button (primary, secondary, ghost, danger; sm/md/icon), Chip, SegmentedControl, Tabs, Field, Switch, OptionCard, ArtboardCard, StatusBanner, Progress, Toast, Dialog, Drawer, Tooltip, EmptyState, Skeleton, Rail, Stat.
- Documentar estados default/hover/focus/active/selected/disabled/loading e regras de uso.
- Storybook (ou uma rota `/design`) + snapshots visuais em 5 larguras.
- Adicionar `eslint-plugin-jsx-a11y`, `@axe-core/playwright` e stylelint com regra de tokens.
- Definir Definição de Pronto: estados vazios, carregando, erro, teclado, 320 px e 200% de zoom.

---

### DS-04 · Movimento sem hierarquia

**Severidade:** P2 · **Esforço:** P

Há shimmer infinito no progresso, laser scan na landing, hover translate/scale, fade-up e animações de 500 ms. O `prefers-reduced-motion` global é ótimo, mas falta uma escala intencional.

**Recomendação**

- Durações: 120 ms (feedback), 180 ms (hover/estado), 240 ms (entrada/saída de painel); evitar 500 ms em interações frequentes.
- Shimmer apenas em progresso indeterminado; não usar em barras com progresso real.
- Respeitar reduced-motion também para o laser/parallax da landing (já coberto pelo CSS global, validar).
- Oferecer preferência "reduzir efeitos" na UI, além da preferência do sistema.

---

### DS-05 · Ícones e espaçamento

**Severidade:** P2 · **Esforço:** P

Tamanhos de ícone variam 2,5 / 3 / 3,5 / 4 / 5 / 6; espaçamentos usam 1.5/2/2.5/3/3.5/4/5 sem uma grade explícita. Não é um problema grave, mas a consistência melhora a percepção de qualidade.

**Recomendação**

- Grid base 4 px; usar 8/12/16/24/32 para padding e gap; ícones em 14/16/18/20/24 conforme contexto.
- Alinhamento óptico em botões com ícone + texto; não centralizar ópticamente com padding assimétrico.
- Estados de ícone: `currentColor`, tamanho consistente, `strokeWidth` 1,8–2,2.

---

## 12. Conteúdo, confiança e landing page

### ~~COPY-01 · Promessas da landing divergem do produto~~ **✅ Concluído**

> **Implementado em 06/11/2026.** As fontes Plus Jakarta Sans e JetBrains Mono agora são auto-hospedadas com `@fontsource-variable`; os links do Google Fonts e os preconnects foram removidos. A verificação de rede mostrou **apenas requisições para 127.0.0.1:3000** e `document.fonts.status === 'loaded'`. Na landing, o FAQ passou a usar `MAX_URLS` (50, processamento sequencial), o ZIP deixou de ser "criptografado", o PDF virou "texto selecionável", o limite de viewport foi para 7680 px e o texto de autenticação fala em headers/cookies. O gate "Entrar" permanece como IA-03.

**Severidade:** P1 · **Esforço:** P · **Onde (estado anterior):** `LandingPage.tsx:399, 675, 482-495`, `README.md:24, 210-214`, `index.html`

| Onde | Texto atual | Problema | Ajuste |
|---|---|---|---|
| FAQ | ~~"lotes de até 25 URLs simultâneas" e "pools concorrentes"~~ | ~~O limite é 50 e as capturas são sequenciais~~ | **✅ Corrigido:** usa `MAX_URLS` e explica o processamento sequencial |
| Feature 04 | ~~"ZIP criptografado"~~ | ~~JSZip não criptografa ZIPs~~ | **✅ Corrigido:** "ZIP consolidado" |
| Métrica | ~~"100% Local" com Google Fonts~~ | ~~Requisição a terceiros~~ | **✅ Corrigido:** fontes auto-hospedadas, zero requests externos |
| Hero/FAQ | ~~"bypass de autenticação por injeção direta de storage"~~ | ~~O produto oferece headers/cookies~~ | **✅ Corrigido:** headers HTTP e cookies de sessão |
| Métrica | ~~"até 3840px"~~ | ~~O motor aceita 7680 px~~ | **✅ Corrigido:** "até 7680 px" |
| PDF | ~~"links ativos"~~ | ~~Não validado~~ | **✅ Corrigido:** "texto selecionável" |
| Gate | "Entrar" / "Entrar no workspace" | Não há autenticação | "Abrir workspace" |

**Recomendação**

- Importar constantes reais (`MAX_URLS`, limites de viewport) na landing para evitar drift; para textos, usar um arquivo de conteúdo central.
- Revisar claims com produto/engenharia antes de publicar; adicionar nota "demonstração visual" ao mock.
- Se a privacidade for diferencial, auto-hospedar fontes e remover qualquer terceiro; documentar a promessa.

**Aceite:** revisão de conteúdo aprova cada claim; nenhuma afirmação de segurança/criptografia sem implementação; teste automatizado garante que `MAX_URLS` exibido = constante.

---

### COPY-02 · Deck de microcopy

**Severidade:** P1 · **Esforço:** P · **Onde:** todos os componentes

| Antes | Depois | Motivo |
|---|---|---|
| "Entrar" | "Abrir workspace" | Não é login |
| "Baixar .zip" | "Baixar ZIP" | Clareza e convenção |
| "Confirmar" (limpar) | "Confirmar exclusão" | Ação explícita |
| "Capturar links de exemplo" | "Testar com 3 sites de exemplo" | Explicita rede e efeito |
| "Hidratando DOM" | "Carregando conteúdo dinâmico" | Linguagem de tarefa |
| "Pausa hero" | "Espera da primeira dobra" | Menos jargão |
| "Delay final" | "Espera final" | Consistência em PT-BR |
| "Atenuar ruído / grain" | "Reduzir ruído visual" | Menos estrangeirismo |
| "3 prontas" | "3 capturas prontas" | Unidade clara |
| "artboards" | "capturas" (ou definir no glossário) | Consistência |
| "Falha ao renderizar a página" | "Não foi possível capturar esta página. [detalhe]" | Ação e contexto |
| "O navegador bloqueou a cópia" | "Não foi possível copiar a imagem. Baixe o arquivo ou tente novamente." | Instrução clara |

- Manter "você" e voz ativa; frases curtas; evitar "por favor".
- Erros: o que aconteceu + por quê + o que fazer; nunca só "erro".
- Adicionar glossário de "lote", "captura", "fila", "viewport", "full-page" em uma página de ajuda.

---

### COPY-03 · Erros do servidor/Chromium precisam de tradução e ação

**Severidade:** P2 · **Esforço:** P · **Onde:** `App.tsx:330-352, 434-442`, `server.ts:33-46`

Mensagens de fallback do Chromium podem vir em inglês e com detalhes técnicos. O card de erro mostra a string crua; não há classificação nem cópia.

**Recomendação**

- Normalizar no servidor para `{ code, message, hint }`; manter o detalhe técnico em um campo separado ("Detalhes técnicos"), colapsável.
- Mapear códigos: `NAV_TIMEOUT`, `DNS`, `AUTH`, `EMPTY_PAGE`, `TOO_LARGE`, `BLOCKED`.
- No card: ícone + mensagem amigável + dica acionável + "Copiar detalhes".
- Evitar "A página retornou 0 bytes por limites de renderização" como fallback genérico; usar "A página não gerou conteúdo capturável."

---

### COPY-04 · Formatação regional

**Severidade:** P2 · **Esforço:** P · **Onde:** `snapper.ts:292-314, 316-335`

`formatBytes` usa ponto decimal ("1.4 MB"), mas pt-BR usa vírgula; não há data nas capturas (só hora); `[data]` usa UTC. A UI mistura formatos.

**Recomendação**

- `Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 })` para bytes.
- `Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' })` para capturas; incluir data quando o lote atravessar dias.
- Um único helper de data local usado por UI, preview de nome e servidor.
- Pluralização com `Intl.PluralRules` ou um helper `plural(n, singular, plural)`.

---

### COPY-05 · Metadados sociais incompletos e título estático

**Severidade:** P2 · **Esforço:** P · **Onde:** `index.html:7-20`

Há `og:title`, `og:description`, `og:type` e `twitter:card`, mas falta `og:image`, `og:url` e `canonical`; sem imagem, compartilhamentos ficam sem preview. O título não muda por tela.

**Recomendação**

- Criar `public/og-image.png` (1200×630) com a marca e uma captura real; adicionar `og:image`, `og:image:alt`, `twitter:image`, `og:url`, `canonical`, `robots`.
- Título contextual por rota (ver IA-06).
- Se a landing for indexável, considerar prerender/SSG mínimo; para app local, robots `noindex` no workspace.

---

### LAND-01 · Navegação da landing desaparece no mobile

**Severidade:** P1 · **Esforço:** P · **Onde:** `LandingPage.tsx:62-79`

Os links de navegação são `hidden md:flex`; no mobile, só resta o botão "Entrar". O usuário não consegue saltar para Recursos, Comparativo ou FAQ.

**Recomendação**

- Menu compacto (hambúrguer) com drawer/sheet, focus trap, links e CTA; ou uma barra horizontal scrollável com âncoras.
- Manter "Abrir workspace" fixo no header mobile.
- Adicionar `aria-expanded`, `aria-controls` e fechar ao navegar.
- Considerar CTA fixo no rodapé em scroll longo (com cuidado para não cobrir conteúdo).

---

### LAND-02 · O mock "interativo" não reage de verdade

**Severidade:** P1 · **Esforço:** P · **Onde:** `LandingPage.tsx:161-334`

Os botões Desktop/Tablet/Mobile mudam apenas dois números na telemetria; a área de preview não muda de largura, não há indicação de estado e o mock exibe dados fictícios como se fossem reais ("DOM Estabilizado 3180ms"). Isso gera expectativa quebrada e ruído para leitores de tela.

**Recomendação**

- Fazer o mock responder: alterar a largura máxima do "viewport" simulado, esconder/mostrar colunas do esqueleto e atualizar a telemetria; adicionar `aria-pressed` nos botões.
- Rotular "Demonstração visual — dados ilustrativos" e marcar a telemetria como `aria-hidden` com descrição `sr-only`.
- Alternativa mais forte: substituir o mock por um carrossel de capturas reais com zoom, ou um vídeo curto de 10 s. Prova real converte melhor que simulação.
- Se o mock não puder reagir, torná-lo estático e remover os botões; um controle que não faz nada é pior que nenhum controle.

---

### LAND-03 · Densidade e ritmo da landing

**Severidade:** P2 · **Esforço:** M · **Onde:** `LandingPage.tsx:96-730`

A página é longa e bem produzida, mas repete a mesma estrutura (eyebrow, H2, parágrafo, grid) em cinco seções. Em mobile, o caminho até o FAQ é longo.

**Recomendação**

- Reduzir para 4 blocos principais: Proposta + demo, Como funciona, Diferenciais comparativos, FAQ/CTA.
- Usar navegação por âncoras com estado ativo (scroll spy) e indicador de seção.
- Diminuir o texto de features; manter uma frase + 2–3 provas.
- Testar tempo até o CTA e profundidade de scroll; ajustar com dados.

---

### LAND-04 · Rodapé sem links úteis

**Severidade:** P2 · **Esforço:** P · **Onde:** `LandingPage.tsx:733-757`

O rodapé tem marca, copyright e um link repetido de "Entrar". Faltam documentação, atalhos, changelog, versão, status e contato.

**Recomendação**

- Adicionar: Documentação, Atalhos, Changelog, GitHub (se aplicável), versão, "processamento local".
- Um link "Ajuda" que abre o diálogo de atalhos ou uma página de docs.
- Manter o rodapé simples; não transformar em sitemap.

---

## 13. Backlog consolidado

| ID | Área | Resumo | Sev. | Esforço |
|---|---|---|---|---|
| ~~PERF-01~~<br>**✅ Concluído** | Desempenho | ~~Thumbnail real + arquivo sob demanda; sem base64 duplicado~~ | P0 | G |
| ~~FORM-01~~<br>**✅ Concluído** | Dados | ~~Colisão de nomes e data UTC~~ | P0 | P |
| ~~FORM-02~~<br>**✅ Concluído** | Dados | ~~Destrutivos sem undo; exemplos sobrescrevem URLs~~ | P0 | P |
| ~~FB-08~~<br>**✅ Concluído** | Dados | ~~Refresh/sair descartam capturas sem aviso~~ | P0 | P |
| ~~A11Y-01~~<br>**✅ Concluído** | A11y | ~~Contraste de textos secundários~~ | P0 | P |
| ~~RESP-01~~<br>**✅ Concluído** | Responsivo | ~~Inspetor inacessível < 1536 px~~ | P1 | M |
| ~~FB-01~~<br>**✅ Concluído** | Feedback | ~~Fila/estado por URL invisível~~ | P1 | M |
| ~~PERF-02~~<br>**✅ Concluído** | Desempenho | ~~ZIP na main thread e progresso enganoso~~ | P1 | M |
| ~~A11Y-02~~<br>**✅ Concluído** | A11y | ~~Botão remover invisível no foco~~ | P1 | PP |
| ~~COPY-01~~<br>**✅ Concluído** | Conteúdo | ~~Claims divergentes e fontes externas~~ | P1 | P |
| IA-01 | IA | Fluxo e próximo passo não explícitos | P1 | M |
| IA-02 | IA | CTAs primários duplicados | P1 | P |
| IA-04 | IA | Fila sem representação | P1 | M |
| VIS-01 | Visual | Âmbar com quatro significados | P1 | P |
| RESP-02 | Responsivo | Toolbar mobile esconde ações/nomes ruins | P1 | P |
| RESP-03 | Responsivo | Grid estoura em 320 px | P1 | PP |
| RESP-04 | Responsivo | Alvos de toque e zoom iOS | P1 | P |
| RESP-07 | A11y | Drawer de config sem semântica de diálogo | P1 | P |
| A11Y-03 | A11y | Toasts/erros e live region | P1 | P |
| A11Y-04 | A11y | Toggles, skip link e canvas focável | P1 | P |
| FORM-03 | Formulário | Pré-voo de lote | P1 | M |
| FORM-04 | Formulário | Entrada/validação de URLs | P1 | M |
| FORM-05 | Formulário | Validação de dimensões | P1 | P |
| FORM-06 | Segurança | Credenciais em texto puro | P1 | P |
| FB-02 | Feedback | Copy das fases | P1 | P |
| FB-03 | Feedback | Retry em massa e taxonomia de erro | P1 | P |
| FB-04 | Feedback | Novas capturas fora da viewport | P1 | P |
| FB-07 | Feedback | Progresso do ZIP | P1 | P |
| GAL-01 | Produtividade | Busca, ordenação, seleção múltipla | P1 | M |
| GAL-02 | Produtividade | Excesso de ações por card | P1 | M |
| PERF-03 | Desempenho | Code splitting landing/workspace/JSZip | P1 | P |
| PERF-04 | Desempenho | Re-render de todos os cards | P1 | P |
| ~~PERF-05~~<br>**✅ Concluído** | Desempenho | ~~Fontes externas/offline~~ | P1 | P |
| DS-01 | Design system | Tokens de cor/raio/tipografia | P1 | M |
| DS-02 | Design system | Escala tipográfica | P1 | P |
| LAND-01 | Landing | Navegação mobile ausente | P1 | P |
| LAND-02 | Landing | Mock não reage e engana | P1 | P |
| IA-03 | IA | Gate "Entrar" sem auth | P2 | P |
| IA-05 | Conteúdo | Terminologia inconsistente | P2 | P |
| IA-06 | IA | Rotas/título/histórico | P2 | P |
| IA-07 | IA | Onboarding | P2 | M |
| VIS-02 | Visual | Feedback duplicado | P2 | P |
| VIS-03 | Visual | Thumbnail full-page vs crop | P2 | M |
| VIS-04 | Visual | Estados ativos inconsistentes | P2 | P |
| VIS-05 | Visual | Empty state e exemplos | P2 | P |
| RESP-05 | Responsivo | Painéis redimensionáveis | P2 | M |
| RESP-06 | Responsivo | Safe areas/teclado | P2 | P |
| A11Y-05 | A11y | Landing: FAQ/tabela/mock | P2 | P |
| A11Y-06 | A11y | Foco, zoom, forced colors | P2 | P |
| A11Y-07 | A11y | Tooltip acessível | P2 | P |
| FORM-07 | Formulário | Reset com undo | P2 | P |
| FORM-08 | Formulário | Parada gradual | P2 | P |
| FORM-09 | Formulário | Slider de qualidade | P2 | P |
| FORM-10 | Formulário | Presets salvos | P2 | M |
| FB-05 | Feedback | Manifesto/resumo | P2 | P |
| FB-06 | Feedback | Título/notificação | P2 | P |
| GAL-03 | Galeria | Metadados undefined/legibilidade | P2 | P |
| GAL-04 | Galeria | Densidade persistida | P2 | P |
| GAL-05 | Galeria | Renomear/copiar nome | P2 | P |
| PERF-06 | Desempenho | Memória entre execuções | P2 | P |
| PERF-07 | Desempenho | Virtualização | P2 | M |
| DS-03 | Design system | Documentação de componentes | P2 | M |
| DS-04 | Design system | Movimento | P2 | P |
| DS-05 | Design system | Ícones/espaçamento | P2 | P |
| COPY-02 | Conteúdo | Microcopy | P1 | P |
| COPY-03 | Conteúdo | Erros acionáveis | P2 | P |
| COPY-04 | Conteúdo | Formatação regional | P2 | P |
| COPY-05 | Conteúdo | SEO/social | P2 | P |
| LAND-03 | Landing | Densidade/ritmo | P2 | M |
| LAND-04 | Landing | Rodapé/docs | P2 | P |

---

## 14. Plano de execução sugerido

### Fase 0 — Estancar perdas e barreiras (semana 1)

**Objetivo:** eliminar riscos de perda de dados, falhas de contraste e atritos óbvios com baixo esforço.

- ~~FORM-01 (unicidade + data local)~~ **✅ Concluído**
- ~~FORM-02 (undo/confirmação + exemplos não destrutivos)~~ **✅ Concluído**
- ~~FB-08 (`beforeunload` + diálogo ao sair)~~ **✅ Concluído**
- ~~A11Y-01 (contraste de texto e placeholders)~~ **✅ Concluído**
- ~~A11Y-02 (foco no remover)~~ **✅ Concluído**
- RESP-03 (grid 320)
- RESP-02 (aria-labels e ZIP mobile)
- ~~COPY-01 (claims e fontes)~~ **✅ Concluído**
- COPY-02 (microcopy)
- PERF-03 (code splitting da rota; JSZip já saiu do cliente)
- ~~PERF-05 (fontes self-hosted)~~ **✅ Concluído**

**Saída esperada:** nenhuma perda silenciosa; WCAG AA de contraste; mobile funcional; landing honesta.

### Fase 1 — Escala e mobile (semanas 2–3)

- ~~PERF-01 (thumbnail real + arquivo sob demanda)~~ **✅ Concluído**
- ~~PERF-02 (ZIP no servidor + progresso/cancelamento)~~ **✅ Concluído**
- FB-07 (validar 50 arquivos e cancelamento no servidor)
- ~~RESP-01 (inspetor em drawer/persistente)~~ **✅ Concluído**
- RESP-07 (config mobile acessível)
- ~~FB-01 (fila visível, cards pendentes)~~ **✅ Concluído**
- IA-04 (refinamento da fila e layout)
- FORM-03 (pré-voo)
- A11Y-03/04 (toasts, live region, skip link, canvas focável)
- GAL-06 (filtros mobile)

**Saída esperada:** lotes de 20–50 páginas estáveis; detalhes acessíveis em qualquer tela; sensação de progresso desde o primeiro segundo.

### Fase 2 — Produtividade e consistência (semanas 4–6)

- IA-01/IA-02 (modelo mental e CTA único)
- GAL-01/GAL-02 (busca, ordenação, seleção, card simplificado)
- FORM-04/FORM-05/FORM-06 (entrada de URLs, dimensões, credenciais)
- FORM-10 (presets salvos)
- VIS-01/VIS-03/VIS-04 (hierarquia, full-page thumbs, padrões de estado)
- DS-01/DS-02 (tokens e escala tipográfica)
- FB-03/FB-04/FB-05 (retry em massa, novas capturas, resumo/manifesto)

**Saída esperada:** ferramenta rápida para power users; consistência visual; base para escalar features.

### Fase 3 — Polimento contínuo

- A11Y-05/06/07, COPY-03/04/05, LAND-01..04, DS-03..05, RESP-05/06, FORM-07..09, GAL-03..05, PERF-06/07.
- Criar rotina de auditoria trimestral (axe + Lighthouse + teste com 5 usuários + revisão de conteúdo).

**Dependências:** PERF-01 deve preceder virtualização e thumbnails full-page; DS-01 precede tema/consistência; RESP-01 pode ser feito em paralelo a PERF-01.

---

## 15. Métricas e validação

### 15.1 Métricas de experiência

| Métrica | Como medir | Meta sugerida |
|---|---|---|
| Tempo até a primeira captura (TTFC) | Teste moderado + instrumentação local | < 3 min no primeiro uso; < 60 s no recorrente |
| Taxa de conclusão do lote | Itens com sucesso / total | ≥ 95% em 10 URLs |
| Sucesso do ZIP | ZIP baixado e aberto com N entradas | 100% dos lotes concluídos |
| Abandono durante a execução | Início sem conclusão / início | < 5% |
| Recuperação de falhas | Retentativas com sucesso / retentativas | > 70% |
| Tempo para encontrar uma captura | Teste com 50 itens | < 10 s |
| Erros de tarefa | Observação moderada | 0 erros críticos em 5 usuários |
| UMUX-Lite/SUS | Questionário pós-teste | Baseline + 10 pontos |

### 15.2 Métricas técnicas

| Métrica | Meta |
|---|---|
| axe-core (crítico/sério) | 0 violações nas telas principais |
| Contraste manual | 100% do texto informativo ≥ 4,5:1 |
| Navegação só por teclado | 100% das tarefas principais |
| LCP landing | < 2,5 s em 4G |
| INP | < 200 ms durante captura/rolagem |
| CLS | < 0,05 |
| Bundle inicial (gzip) | Definir orçamento; landing < 120 KB |
| Memória em 20×4K full-page | Dentro do orçamento definido (ex.: 1,5 GB) |
| SSE por item | < 100 KB após PERF-01 **✅** |

### 15.3 Instrumentação

- Manter a promessa local-first: eventos apenas locais/opt-in, sem third-party.
- Eventos úteis: `workspace_open`, `run_start` (count, format, viewport), `run_finish` (success, failed, duration), `zip_start/finish`, `error_shown` (code), `retry`, `preset_saved`, `search_used`.
- Nunca registrar URLs completas, headers, cookies ou imagens; usar hostname hasheado ou nada.
- Medir com `performance.mark/measure` para fases da UI (não confundir com as fases do servidor).

---

## 16. Plano de testes

### 16.1 Matriz mínima

| Dimensão | Casos |
|---|---|
| Viewports | 320×568, 360×640, 390×844, 768×1024, 1024×768, 1280×800, 1366×768, 1440×900, 1920×1080, 2560×1440 |
| Entrada | teclado only, toque, mouse, leitor de tela (NVDA + VoiceOver), zoom 200%/400% |
| Preferências | `prefers-reduced-motion`, alto contraste/forced colors, tema do sistema |
| Rede | offline, servidor lento, SSE interrompido, erro 500, timeout de página |
| Dados | 0 URLs, 1 URL, 50 URLs, duplicadas, URL inválida, página vazia, página muito longa, PDF |
| Ações | capturar, interromper, retry individual/todas, remover, limpar com undo, ZIP, refresh, sair |

### 16.2 Automação

- Playwright: fluxo feliz (3 URLs), falha parcial, stop, retry, ZIP (mock), abrir/fechar drawer, teclado no preview.
- `@axe-core/playwright` em landing, workspace vazio, workspace com resultados, prévia.
- Snapshot visual em 5 larguras; comparar com baseline.
- Testes unitários para `dedupeUrls`, `countDuplicates`, `previewFileName`, colisão de nomes, data local, `formatBytes`, `parseUrls`.
- Lighthouse CI na landing; orçamento de bundle no CI.
- Teste de memória: script que simula 20 capturas 4K e mede heap.

### 16.3 Roteiro de teste moderado (5–8 pessoas)

1. Abrir a landing e explicar em uma frase o que o produto faz (compreensão).
2. Entrar no workspace e capturar 3 sites fornecidos.
3. Alterar viewport para mobile, capturar novamente e comparar.
4. Encontrar a captura de um domínio específico, abrir a prévia e baixar uma imagem.
5. Gerar o ZIP e localizar um arquivo.
6. Simular uma falha (URL inválida) e recuperar.
7. Fechar a aba durante a captura e relatar o que esperava.
8. Tentar realizar tudo apenas com teclado.

Observar: tempo, erros, hesitações, compreensão de "fila/captura/artboard", descoberta de ações no card e reação a avisos.

---

## 17. O que não fazer

- **Não transformar o workspace em wizard linear.** O valor está em ter configuração, canvas e detalhe visíveis ao mesmo tempo. O indicador de etapa deve orientar, não bloquear.
- **Não adicionar mais um CTA âmbar.** O problema atual é excesso de primários, não falta.
- **Não esconder ações essenciais atrás de hover ou de overflow no mobile.** ZIP, captura e detalhes precisam estar sempre alcançáveis.
- **Não usar modal para tudo.** Ações reversíveis pedem undo; modais apenas para consequências irreversíveis ou decisões complexas (pré-voo).
- **Não criar um tema claro completo antes dos tokens.** O dark é identidade; primeiro corrija contraste e consistência.
- **Não otimizar virtualização antes de PERF-01.** O gargalo é imagem/memória, não quantidade de nós.
- **Não publicar claims não implementados** (criptografia, concorrência, bypass de storage). A confiança é parte da UX.
- **Não trocar a identidade âmbar/estúdio** por um visual genérico; o diferencial visual deve ser preservado.

---

## 18. Perguntas em aberto (para calibrar prioridades)

1. Quem é o usuário primário: QA/engenharia, design, jurídico/auditoria ou marketing? A prioridade entre densidade técnica e simplicidade muda.
2. Mobile é uso real ou apenas consulta de emergência? Isso define se o inspetor vira bottom sheet completo ou visualização read-only.
3. Haverá autenticação/multiusuário? Se sim, o gate e a persistência de credenciais precisam de outra arquitetura.
4. Existe requisito offline/air-gapped? Se sim, fontes self-hosted e ausência de terceiros são obrigatórias.
5. Qual o orçamento de memória/hardware mínimo? Define limites de lote, resolução e virtualização.
6. Capturas precisam de trilha de auditoria (timestamp imutável, hash, manifesto assinado)? Isso muda o modelo de exportação.
7. O produto será publicado como SaaS ou permanece local? Afeta SSRF, autenticação, rate limit e conteúdo da landing.

---

## Apêndice A — Snippets de quick wins

### A.1 Foco visível no remover

```tsx
<button
  type="button"
  onClick={() => onRemove(item.id)}
  aria-label={`Remover captura de ${hostOf(item.url)}`}
  className={cn(
    'flex h-6 w-6 shrink-0 items-center justify-center rounded text-slate-400',
    'opacity-100 transition-opacity hover:bg-rose-400/10 hover:text-rose-300',
    '[@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100',
    'focus-visible:opacity-100 group-focus-within:opacity-100'
  )}
>
  <X className="h-3 w-3" />
</button>
```

### A.2 Grid sem overflow em 320 px

```tsx
className={cn(
  'grid gap-3.5',
  density === 'compact'
    ? 'grid-cols-[repeat(auto-fill,minmax(min(100%,250px),1fr))]'
    : 'grid-cols-[repeat(auto-fill,minmax(min(100%,310px),1fr))]'
)}
```

### A.3 Aviso ao sair com capturas

```tsx
useEffect(() => {
  if (!isRunning && items.length === 0) return;
  const handler = (event: BeforeUnloadEvent) => {
    event.preventDefault();
    event.returnValue = '';
  };
  window.addEventListener('beforeunload', handler);
  return () => window.removeEventListener('beforeunload', handler);
}, [isRunning, items.length]);
```

### A.4 Nome de arquivo único (cliente e servidor)

```ts
function uniqueEntry(used: Set<string>, name: string): string {
  if (!used.has(name)) {
    used.add(name);
    return name;
  }
  const dot = name.lastIndexOf('.');
  const base = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot) : '';
  let index = 2;
  let candidate = `${base}-${index}${ext}`;
  while (used.has(candidate)) {
    index += 1;
    candidate = `${base}-${index}${ext}`;
  }
  used.add(candidate);
  return candidate;
}
```

### A.5 Data local (substituir `toISOString().slice(0, 10)`)

```ts
function localDateString(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
```

### A.6 JSZip sob demanda

```ts
const { default: JSZip } = await import('jszip');
```

### A.7 Skip link

```tsx
<a
  href="#canvas"
  className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[80] focus:rounded-lg focus:bg-amber-400 focus:px-4 focus:py-2 focus:font-semibold focus:text-[#1b1305]"
>
  Pular para as capturas
</a>
```

### A.8 Progresso com texto acessível

```tsx
<div
  role="progressbar"
  aria-valuemin={0}
  aria-valuemax={100}
  aria-valuenow={percent}
  aria-valuetext={`${progress.finished} de ${progress.total} capturas concluídas`}
  aria-label="Progresso do lote"
/>
```

### A.9 Rótulos acessíveis na toolbar mobile

```tsx
<button
  type="button"
  onClick={onZip}
  aria-label={
    zipState.active
      ? 'Gerando arquivo ZIP'
      : `Baixar ZIP com ${validItems.length} arquivos`
  }
  title="Baixar todas as capturas em um ZIP"
  className="btn btn-primary btn-sm"
>
  <FileArchive className="h-3.5 w-3.5" aria-hidden="true" />
  <span className="hidden sm:inline">Baixar ZIP</span>
  <span aria-hidden="true" className="font-mono text-[11.5px] font-bold opacity-70">
    {validItems.length}
  </span>
</button>
```

### A.10 Estrutura mínima de um toast com ação

```tsx
<div role={kind === 'error' ? 'alert' : 'status'} className="...">
  <span className="flex-1">{message}</span>
  {action && (
    <button type="button" onClick={action.onClick} className="font-semibold text-amber-300">
      {action.label}
    </button>
  )}
  <button type="button" aria-label="Fechar notificação" onClick={() => onDismiss(id)}>
    <X className="h-3.5 w-3.5" />
  </button>
</div>
```

---

## Apêndice B — Evidências principais

> As referências abaixo descrevem o **estado anterior** à rodada de implementação. As linhas relacionadas a PERF-01, FORM-01, FORM-02, FB-08, A11Y-01, RESP-01, FB-01, PERF-02, A11Y-02, COPY-01 e PERF-05 são históricas; o código atual já foi alterado.

| Evidência | Referência | Achado relacionado |
|---|---|---|
| `previewDataUrl = dataUrl` para imagens | `server.ts:1163` | PERF-01 |
| PDF inteiro em base64 no SSE | `server.ts:1119-1120` | PERF-01 |
| Thumbnail usando a imagem completa | `ResultsPanel.tsx:822` | PERF-01 |
| ZIP no cliente com JSZip | `App.tsx:552-595` | PERF-02, FB-07 |
| Nomes gerados com UTC | `snapper.ts:318`, `server.ts:117` | FORM-01 |
| `zip.file` sobrescreve nome repetido | `App.tsx:564`, `server.ts:1358` | FORM-01 |
| Remover com `opacity-0` no desktop | `ResultsPanel.tsx:635` | A11Y-02 |
| `.label` e textos `slate-600` | `index.css:228-234`, vários componentes | A11Y-01 |
| Inspetor só em `2xl` | `App.tsx:814`, `Inspector.tsx:666`, `TopBar.tsx:120` | RESP-01 |
| Drawer sem `role="dialog"`/focus trap | `App.tsx:712-739` | RESP-07 |
| `aria-pressed={!isConfigCollapsed}` | `TopBar.tsx:105` | A11Y-04 |
| Toast único `aria-live` 4,5 s | `ui.tsx:132-167` | A11Y-03 |
| Live region atômica do progresso | `ResultsPanel.tsx:103-111` | A11Y-03 |
| Grid `minmax(310px,1fr)` | `ResultsPanel.tsx:289` | RESP-03 |
| ZIP sem rótulo abaixo de `sm` | `ResultsPanel.tsx:207-214` | RESP-02 |
| "Limpar lista" imediato | `ConfigPanel.tsx:405-413` | FORM-02 |
| Exemplos substituem URL list | `App.tsx:636-639` | FORM-02 |
| Sem `beforeunload` | busca em `src/` sem resultado | FB-08 |
| Google Fonts externo | `index.html:25-31` | PERF-05, COPY-01 |
| Landing: 25 URLs e ZIP criptografado | `LandingPage.tsx:675, 399` | COPY-01 |
| Mock só altera telemetria | `LandingPage.tsx:174-334` | LAND-02 |
| Sem `og:image` | `index.html:11-20` | COPY-05 |
| Bundle único com workspace | `main.tsx:2`, `dist/assets/index-DlUjkBFv.js` | PERF-03 |
| Sem testes automatizados no `package.json` | `package.json:5-11` | Qualidade |

---

## Apêndice C — Checklist de aceite por release

### Produto / UX

- [ ] Um único CTA primário por região em todas as larguras.
- [x] Fila visível desde o início da execução, com status por URL. **✅ Concluído**
- [x] Ações destrutivas têm confirmação ou desfazer; exemplos não sobrescrevem URLs. **✅ Concluído**
- [x] Refresh/sair com capturas avisa e oferece ZIP. **✅ Concluído**
- [x] Nome de arquivo único, data local e renomeação antes do download. **✅ Concluído**
- [ ] Manifesto CSV/JSON exportável.
- [ ] Busca, ordenação e seleção múltipla funcionam com 50 itens.

### Acessibilidade

- [ ] axe-core sem violações críticas/sérias nas 4 telas principais.
- [x] Contraste de todo texto informativo ≥ 4,5:1. **✅ Concluído (computed styles)**
- [ ] Tarefas principais completas apenas com teclado.
- [x] Foco visível em todos os controles, inclusive remover card. **✅ Concluído**
- [x] Drawer do inspetor e diálogos com foco contido e restaurado. **✅ Concluído**
- [ ] Drawer de configuração mobile com foco contido (RESP-07).
- [ ] Toasts de erro persistentes e anunciados.
- [ ] Nenhum conteúdo essencial depende de hover ou de `title`.
- [ ] Teste com NVDA e VoiceOver nas telas de workspace e prévia.
- [ ] Zoom 200%/400% sem perda de função.
- [ ] `prefers-reduced-motion` e forced colors validados.

### Responsivo / mobile

- [ ] 320, 390, 768, 1024, 1280, 1440 e 1920 px sem overflow.
- [ ] ZIP, captura e detalhes acessíveis no mobile.
- [ ] Alvos de toque ≥ 44 px; inputs com 16 px no iOS.
- [x] Inspeção de detalhes disponível em tablet e notebook. **✅ Concluído**
- [ ] Safe areas e teclado virtual validados.

### Desempenho

- [ ] Lote de 20×4K full-page sem travar; memória dentro do orçamento.
- [x] SSE por item < 100 KB; thumbnails reais. **✅ Concluído**
- [x] ZIP responsivo e cancelável (cancelamento no cliente). **✅ Concluído**
- [ ] Landing com bundle inicial dentro do orçamento.
- [x] Sem requisições a terceiros; fontes locais. **✅ Concluído**

### Conteúdo

- [x] Claims da landing revisados e alinhados ao comportamento. **✅ Concluído**
- [ ] Terminologia unificada (link, captura, lote, canvas).
- [ ] Todos os erros têm causa + próxima ação.
- [ ] Metadados sociais completos e título por rota.

---

**Próximo passo sugerido:** validar a Fase 0 com o time e executar um teste moderado de 5 pessoas focando em (1) primeiro uso, (2) recuperação de falha e (3) fechamento de aba durante o lote. Os achados desta rodada (PERF-01, FORM-01/02, FB-08, A11Y-01/02, RESP-01, FB-01, PERF-02 e COPY-01) já foram implementados; a validação pendente é de carga (20–50 páginas 4K), leitor de tela, axe-core formal e o restante do backlog — com destaque para RESP-07, FB-07 (50 arquivos) e COPY-02.
