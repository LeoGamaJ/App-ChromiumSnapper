import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import puppeteer, { Browser } from 'puppeteer';
import JSZip from 'jszip';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '100mb' }));

// Helper to sanitize URL
function normalizeUrl(rawUrl: string): string {
  let url = rawUrl.trim();
  if (!url) return '';
  if (url.startsWith('data:') || url.startsWith('file:')) {
    return url;
  }
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url;
  }
  return url;
}

// Customizable file naming pattern
function formatCustomFileName(params: {
  pattern?: string;
  url: string;
  index: number;
  format: string;
  width: number;
  height: number;
}): string {
  const { pattern = '[ordem]_[url]_[resolucao]', url, index, format, width, height } = params;

  const safeUrl = url
    .replace(/^https?:\/\//i, '')
    .replace(/^data:[^,]+/i, 'data_url')
    .replace(/[^a-z0-9_\-\.]/gi, '_')
    .slice(0, 60)
    .replace(/_+/g, '_')
    .toLowerCase();

  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10); // YYYY-MM-DD
  const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '-'); // HH-MM-SS
  const orderStr = String(index + 1).padStart(2, '0');
  const resStr = `${width}x${height}`;

  let result = pattern
    .replace(/\[url\]/gi, safeUrl || 'site')
    .replace(/\[data\]/gi, dateStr)
    .replace(/\[hora\]/gi, timeStr)
    .replace(/\[ordem\]/gi, orderStr)
    .replace(/\[resolucao\]/gi, resStr)
    .replace(/\[formato\]/gi, format);

  // Clean invalid filesystem characters
  result = result.replace(/[^a-z0-9_\-\.]/gi, '_').replace(/_+/g, '_').toLowerCase();
  if (!result.endsWith(`.${format}`)) {
    result = `${result}.${format}`;
  }
  return result;
}

// Parse custom headers from string (Key: Value per line)
function parseCustomHeaders(rawHeaders: string | Record<string, string> | undefined): Record<string, string> {
  if (!rawHeaders) return {};
  if (typeof rawHeaders === 'object' && !Array.isArray(rawHeaders)) {
    return rawHeaders;
  }
  const headers: Record<string, string> = {};
  if (typeof rawHeaders === 'string') {
    rawHeaders.split('\n').forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const colonIndex = trimmed.indexOf(':');
      if (colonIndex > 0) {
        const key = trimmed.slice(0, colonIndex).trim();
        const value = trimmed.slice(colonIndex + 1).trim();
        if (key && value) {
          headers[key] = value;
        }
      }
    });
  }
  return headers;
}

// Parse custom cookies from string or JSON array
function parseCustomCookies(rawCookies: string | undefined, targetUrl: string): any[] {
  if (!rawCookies || !rawCookies.trim()) return [];
  const trimmed = rawCookies.trim();

  // 1. Try parsing JSON array
  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed;
    } catch {}
  }

  // 2. Parse standard Cookie header string (name=value; name2=value2)
  let domain = 'localhost';
  try {
    const urlObj = new URL(targetUrl.startsWith('http') ? targetUrl : `https://${targetUrl}`);
    domain = urlObj.hostname;
  } catch {}

  return trimmed
    .split(';')
    .map((c) => c.trim())
    .filter(Boolean)
    .map((pair) => {
      const equalIndex = pair.indexOf('=');
      if (equalIndex <= 0) return null;
      const name = pair.slice(0, equalIndex).trim();
      const value = pair.slice(equalIndex + 1).trim();
      if (!name) return null;
      return {
        name,
        value,
        domain,
        path: '/',
      };
    })
    .filter(Boolean);
}

// Injeta CSS global via page.addStyleTag no Puppeteer para forçar visibilidade de elementos ocultos e lazy-loading
async function injectLazyLoadVisibilityStyles(page: any) {
  try {
    await page.addStyleTag({
      content: `
        /* 1. Forçar visibilidade e opacidade em todos os elementos estruturais e de conteúdo */
        body,
        body *:not(script):not(style):not(link):not(meta) {
          visibility: visible !important;
          opacity: 1 !important;
        }

        /* 2. Forçar visibilidade, exibição e reset de altura em elementos e wrappers de lazy-loading */
        img[loading="lazy"],
        img[data-src],
        img[data-lazy],
        img[data-lazy-src],
        img[data-original],
        source[data-srcset],
        .lazy,
        .lazyload,
        .lazyloading,
        .lazy-loaded,
        [class*="lazy"],
        [class*="skeleton"],
        .img-wrapper,
        .image-wrapper,
        [class*="placeholder"],
        [class*="img-wrap"] {
          visibility: visible !important;
          opacity: 1 !important;
          height: auto !important;
          min-height: 1px !important;
          max-height: none !important;
        }

        /* 3. Garantir dimensões mínimas para que imagens não fiquem com 0px */
        img {
          visibility: visible !important;
          opacity: 1 !important;
          min-height: 1px !important;
        }

        /* 4. Desbloquear contêineres e wrappers que ocultam seções por overflow ou height 0 */
        html,
        body {
          height: auto !important;
          min-height: 100% !important;
          overflow: visible !important;
          position: static !important;
        }

        /* 5. Prevenir deformação e shearing de texturas e parallax em fullPage */
        *, *::before, *::after {
          background-attachment: scroll !important;
        }

        img, [style*="background-image"], svg {
          image-rendering: -webkit-optimize-contrast !important;
        }

        /* 6. Desativar atrasos de animações para renderizar o estado final imediatamente */
        *, *::before, *::after {
          animation-duration: 0.001s !important;
          animation-delay: 0s !important;
          animation-play-state: running !important;
          transition-duration: 0.001s !important;
          transition-delay: 0s !important;
        }

        /* 7. Forçar exibição de bibliotecas de scroll reveal (AOS, WOW, ScrollTrigger) */
        [data-aos], .aos-animate, .wow, [data-scroll], .fade-in, .animate-fade-in, [class*="reveal"], [class*="animate"] {
          visibility: visible !important;
          opacity: 1 !important;
          transform: none !important;
        }
      `
    });
  } catch (err) {
    console.warn('Aviso: falha ao aplicar addStyleTag:', err);
  }
}

// Estabilização de texturas de fundo, remoção de parallax recortado e otimização de noise/grain
async function stabilizeBackgroundTextures(
  page: any,
  optimizeTextures: boolean = true,
  removeExcessGrain: boolean = false
) {
  if (!optimizeTextures && !removeExcessGrain) return;

  try {
    await page.evaluate((stripGrain: boolean) => {
      // 1. Injetar folha de estilo para forçar scroll em todas as texturas e backgrounds
      const styleId = 'snapper-texture-stabilizer';
      let existingStyle = document.getElementById(styleId);
      if (!existingStyle) {
        existingStyle = document.createElement('style');
        existingStyle.setAttribute('id', styleId);
        document.head.appendChild(existingStyle);
      }

      existingStyle.textContent = `
        *, *::before, *::after {
          background-attachment: scroll !important;
        }
        img, [style*="background-image"], svg {
          image-rendering: -webkit-optimize-contrast !important;
        }
        ${
          stripGrain
            ? `
          [class*="noise"], [class*="grain"], [id*="noise"], [id*="grain"],
          .bg-noise, .bg-grain, [style*="noise"], [style*="grain"],
          feTurbulence, filter[id*="noise"], filter[id*="grain"] {
            opacity: 0.01 !important;
            visibility: hidden !important;
            display: none !important;
          }
        `
            : ''
        }
      `;

      // 2. Desafixar backdrops e texturas com position: fixed para evitar cortes em 1080px ou repetições distorcidas
      const allFixed = Array.from(document.querySelectorAll('*')).filter((el) => {
        const computed = window.getComputedStyle(el);
        if (computed.position !== 'fixed') return false;

        const zIndex = parseInt(computed.zIndex, 10);
        const isLowZ = isNaN(zIndex) || zIndex <= 2;
        const isFullSize =
          el.clientWidth >= window.innerWidth * 0.8 &&
          el.clientHeight >= window.innerHeight * 0.8;
        const className = typeof el.className === 'string' ? el.className : '';
        const idName = typeof el.id === 'string' ? el.id : '';
        const isNoiseOrPattern =
          /noise|grain|pattern|texture|backdrop|mesh|stars|particles|canvas-bg|grid-bg|ambient/i.test(
            className + ' ' + idName
          );

        return (isLowZ && isFullSize) || isNoiseOrPattern;
      });

      allFixed.forEach((el: any) => {
        el.style.setProperty('position', 'absolute', 'important');
        el.style.setProperty('top', '0', 'important');
        el.style.setProperty('left', '0', 'important');
        el.style.setProperty('width', '100%', 'important');
        el.style.setProperty('height', '100%', 'important');
        el.style.setProperty('min-height', '100%', 'important');
        el.style.setProperty('background-attachment', 'scroll', 'important');
      });
    }, removeExcessGrain);
  } catch (err) {
    console.warn('Aviso: falha em stabilizeBackgroundTextures:', err);
  }
}

// Pausa inteligente e espera por fontes e elementos da seção Hero
async function waitForHeroAndFonts(page: any, heroWaitMs: number = 2000) {
  try {
    await page.evaluate(async () => {
      // 1. Aguarda carregamento e renderização de fontes web (Google Fonts / Typekit)
      if (document.fonts && document.fonts.ready) {
        await Promise.race([
          document.fonts.ready,
          new Promise((resolve) => setTimeout(resolve, 3500)),
        ]);
      }

      // 2. Garante decodificação de imagens da viewport inicial (Hero)
      const heroImgs = Array.from(document.querySelectorAll('img')).filter((img) => {
        const rect = img.getBoundingClientRect();
        return rect.top < window.innerHeight * 1.5;
      });

      await Promise.all(
        heroImgs.map(async (img) => {
          if (img.loading === 'lazy') img.loading = 'eager';
          if (img.complete && img.naturalHeight > 0) return;
          if (typeof img.decode === 'function') {
            try {
              await img.decode();
            } catch {}
          }
        })
      );

      // 3. Força play/primeiro frame de vídeos na hero para não saírem como caixas pretas
      const heroVideos = Array.from(document.querySelectorAll('video')).filter((v) => {
        const rect = v.getBoundingClientRect();
        return rect.top < window.innerHeight * 1.5;
      });

      heroVideos.forEach((v) => {
        try {
          v.muted = true;
          v.playsInline = true;
          if (v.paused) {
            v.play().catch(() => {});
          }
        } catch {}
      });
    });
  } catch (err) {
    console.warn('Aviso: falha em waitForHeroAndFonts:', err);
  }

  // 4. Pausa de acomodação para animações e hidratação da hero antes do scroll
  if (heroWaitMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, Math.min(heroWaitMs, 10000)));
  }
}

// Un-clamp page overflow, reveal hidden scroll sections, and force eager loading attributes
async function preparePageDOM(page: any) {
  await injectLazyLoadVisibilityStyles(page);
  await page.evaluate(() => {
    // 1. Remove native lazy loading so browser doesn't wait
    document.querySelectorAll('img[loading], iframe[loading]').forEach((el) => {
      el.removeAttribute('loading');
      el.setAttribute('loading', 'eager');
    });

    // 2. Swap lazy data attributes to actual src/srcset
    document.querySelectorAll('img, source').forEach((el) => {
      const lazySrc =
        el.getAttribute('data-src') ||
        el.getAttribute('data-lazy-src') ||
        el.getAttribute('data-original') ||
        el.getAttribute('data-url') ||
        el.getAttribute('data-hi-res-src');
      if (lazySrc && !el.getAttribute('src')) {
        el.setAttribute('src', lazySrc);
      }

      const lazySrcSet =
        el.getAttribute('data-srcset') ||
        el.getAttribute('data-lazy-srcset');
      if (lazySrcSet && !el.getAttribute('srcset')) {
        el.setAttribute('srcset', lazySrcSet);
      }
    });

    // 3. Swap lazy background images
    document.querySelectorAll('[data-bg], [data-background], [data-bg-src]').forEach((el: any) => {
      const bg =
        el.getAttribute('data-bg') ||
        el.getAttribute('data-background') ||
        el.getAttribute('data-bg-src');
      if (bg && (!el.style.backgroundImage || el.style.backgroundImage === 'none')) {
        el.style.backgroundImage = `url("${bg}")`;
      }
    });
  });
}

// Progressive Viewport Scroll: scrolls smoothly to trigger IntersectionObservers on all sections
async function progressiveScrollAndHydrate(page: any, maxScrollTimeMs = 25000) {
  await page.evaluate(async (maxTime: number) => {
    await new Promise<void>((resolve) => {
      let currentY = 0;
      const startTime = Date.now();
      const viewportHeight = window.innerHeight || 1080;
      const step = Math.floor(viewportHeight * 0.7);

      const timer = setInterval(() => {
        const docHeight = Math.max(
          document.body.scrollHeight,
          document.documentElement.scrollHeight,
          document.body.offsetHeight,
          document.documentElement.offsetHeight,
          document.body.clientHeight,
          document.documentElement.clientHeight
        );

        currentY += step;
        window.scrollTo(0, currentY);

        // Dispatch synthetic scroll and resize events for observer listeners
        window.dispatchEvent(new Event('scroll'));
        window.dispatchEvent(new Event('resize'));

        // Max safety height of 35000px to prevent infinite feeds while covering long landing pages
        if (currentY >= docHeight || (Date.now() - startTime) > maxTime || currentY > 35000) {
          clearInterval(timer);
          window.scrollTo(0, 0);
          window.dispatchEvent(new Event('scroll'));
          // Aguarda 600ms no topo para a barra de navegação e cabeçalho retornarem ao repouso
          setTimeout(() => {
            window.scrollTo(0, 0);
            resolve();
          }, 600);
        }
      }, 100);
    });
  }, maxScrollTimeMs);
}

// Wait for all images in the document to decode completely
async function waitForAllImagesDecoded(page: any, timeoutMs = 8000) {
  return await page.evaluate(async (timeout: number) => {
    const imgs = Array.from(document.querySelectorAll('img'));
    if (imgs.length === 0) return { total: 0, completed: 0 };

    let completedCount = 0;

    await Promise.all(
      imgs.map((img) => {
        if (img.loading === 'lazy') {
          img.loading = 'eager';
        }

        if (img.complete && img.naturalHeight > 0) {
          completedCount++;
          return Promise.resolve();
        }

        if (typeof img.decode === 'function') {
          return img
            .decode()
            .then(() => {
              completedCount++;
            })
            .catch(() => {});
        }

        return new Promise<void>((resolve) => {
          let resolved = false;
          const done = () => {
            if (!resolved) {
              resolved = true;
              if (img.complete && img.naturalHeight > 0) completedCount++;
              resolve();
            }
          };

          img.addEventListener('load', done, { once: true });
          img.addEventListener('error', done, { once: true });
          setTimeout(done, timeout);
        });
      })
    );

    return { total: imgs.length, completed: completedCount };
  }, timeoutMs);
}

// Remove common intrusive cookie/consent overlays if requested
async function dismissConsentOverlays(page: any) {
  try {
    await page.evaluate(() => {
      const selectors = [
        '#onetrust-banner-sdk',
        '.cookie-banner',
        '#cookie-banner',
        '[id*="consent"]',
        '[class*="consent"]',
        '[class*="cookie"]',
        '[id*="cookie"]',
        '.optanon-alert-box-wrapper',
        '.didomi-popup-container',
        '#didomi-host',
        '.cc-banner',
        '#usercentrics-root',
        '.qc-cmp2-container'
      ];
      selectors.forEach((sel) => {
        document.querySelectorAll(sel).forEach((el) => {
          try {
            (el as HTMLElement).style.display = 'none';
          } catch {}
        });
      });
    });
  } catch {}
}

// Health endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// SSE Streaming Batch Endpoint for Interactive UI
app.post('/api/screenshot/stream', async (req: Request, res: Response) => {
  const {
    urls,
    format = 'webp',
    quality = 85,
    width = 1920,
    height = 1080,
    fullPage = true,
    enableAutoScroll = true,
    delayMs = 1200,
    heroWaitMs = 2000,
    stabilizeTextures = true,
    removeExcessGrain = false,
    hideCookieBanners = true,
    colorScheme = 'no-preference',
    namingPattern = '[ordem]_[url]_[resolucao]',
    customHeaders = '',
    customCookies = '',
  } = req.body;

  if (!urls || !Array.isArray(urls) || urls.length === 0) {
    return res.status(400).json({ error: 'Nenhuma URL fornecida.' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const sendEvent = (event: string, data: any) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  const validUrls = urls.map((u: string) => normalizeUrl(u)).filter(Boolean);

  sendEvent('start', {
    total: validUrls.length,
    format,
    viewport: { width, height },
    fullPage,
  });

  let browser: Browser | null = null;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-extensions',
        '--window-size=1920,1080',
      ],
    });

    const parsedHeaders = parseCustomHeaders(customHeaders);

    for (let i = 0; i < validUrls.length; i++) {
      const url = validUrls[i];
      const startTime = Date.now();

      sendEvent('item_start', {
        index: i,
        url,
        status: 'Acessando URL...',
      });

      let page: any = null;
      try {
        page = await browser.newPage();
        await page.setViewport({
          width: Number(width) || 1920,
          height: Number(height) || 1080,
          deviceScaleFactor: 1,
        });

        // 1. Inject custom headers (Authorization, X-Custom, etc.)
        if (Object.keys(parsedHeaders).length > 0) {
          await page.setExtraHTTPHeaders(parsedHeaders);
        }

        // 2. Inject custom cookies (session tokens, login bypass)
        const parsedCookies = parseCustomCookies(customCookies, url);
        if (parsedCookies.length > 0) {
          try {
            await page.setCookie(...parsedCookies);
          } catch (cErr) {
            console.warn('Aviso: cookies não aplicados:', cErr);
          }
        }

        if (colorScheme && colorScheme !== 'no-preference') {
          await page.emulateMediaFeatures([
            { name: 'prefers-color-scheme', value: colorScheme },
          ]);
        }

        await page.setUserAgent(
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
        );

        sendEvent('item_step', {
          index: i,
          step: 'loading',
          status: 'Carregando DOM e assets com headers/cookies aplicados...',
        });

        try {
          await page.goto(url, { waitUntil: 'networkidle2', timeout: 35000 });
        } catch {
          await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {});
        }

        if (hideCookieBanners) {
          await dismissConsentOverlays(page);
        }

        // Prepare DOM: unclamp overflow and force eager loading
        sendEvent('item_step', {
          index: i,
          step: 'hydrating',
          status: 'Desbloqueando overflow e ativando atributos de imagem...',
        });
        await preparePageDOM(page);

        // Aguarda estabilização da seção Hero e fontes web antes de iniciar o scroll
        sendEvent('item_step', {
          index: i,
          step: 'hero_settling',
          status: `Carregando Hero, fontes web e mídia (${heroWaitMs}ms)...`,
        });
        await waitForHeroAndFonts(page, Number(heroWaitMs) || 2000);

        // Estabiliza texturas de fundo e parallax para evitar distorções no fullPage
        if (stabilizeTextures || removeExcessGrain) {
          sendEvent('item_step', {
            index: i,
            step: 'texture_stabilizing',
            status: 'Estabilizando texturas de background e camadas de ruído...',
          });
          await stabilizeBackgroundTextures(page, Boolean(stabilizeTextures), Boolean(removeExcessGrain));
        }

        // Progressive scroll across every section
        if (enableAutoScroll) {
          sendEvent('item_step', {
            index: i,
            step: 'scrolling',
            status: 'Executando scroll progressivo para ativar todas as seções e lazy loads...',
          });
          await progressiveScrollAndHydrate(page, 20000);
          if (hideCookieBanners) {
            await dismissConsentOverlays(page);
          }
        }

        // Ensure all images decode completely
        sendEvent('item_step', {
          index: i,
          step: 'decoding',
          status: 'Garantindo decodificação completa de todas as imagens...',
        });
        const imgStats = await waitForAllImagesDecoded(page, 6000);

        // Re-estabilizar texturas e visibilidade imediatamente antes do snapshot
        if (stabilizeTextures || removeExcessGrain) {
          await stabilizeBackgroundTextures(page, Boolean(stabilizeTextures), Boolean(removeExcessGrain));
        }
        await injectLazyLoadVisibilityStyles(page);

        // Delay settle
        if (delayMs > 0) {
          sendEvent('item_step', {
            index: i,
            step: 'settling',
            status: `Aguardando renderização final (${delayMs}ms)...`,
          });
          await new Promise((resolve) => setTimeout(resolve, Math.min(delayMs, 5000)));
        }

        // Apply visibility styles right before capture
        await injectLazyLoadVisibilityStyles(page);

        // Calculate final real dimensions
        const dimensions = await page.evaluate(() => ({
          pageWidth: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
          pageHeight: Math.max(document.documentElement.scrollHeight, document.body.scrollHeight),
        }));

        // Format custom file name based on token pattern
        const fileName = formatCustomFileName({
          pattern: namingPattern,
          url,
          index: i,
          format,
          width: dimensions.pageWidth,
          height: dimensions.pageHeight,
        });

        sendEvent('item_step', {
          index: i,
          step: 'capturing',
          status: `Renderizando captura ${format.toUpperCase()} de alta resolução...`,
        });

        let dataUrl = '';
        let previewDataUrl = '';
        let byteSize = 0;

        if (format === 'pdf') {
          // Generate Continuous Vector PDF
          const pdfBuffer = await page.pdf({
            width: `${dimensions.pageWidth}px`,
            height: `${Math.max(1080, dimensions.pageHeight)}px`,
            printBackground: true,
            margin: { top: '0px', right: '0px', bottom: '0px', left: '0px' },
            pageRanges: '1',
          });

          byteSize = pdfBuffer.length;
          dataUrl = `data:application/pdf;base64,${pdfBuffer.toString('base64')}`;

          // Also generate a WebP thumbnail for interactive gallery preview
          const previewShot = (await page.screenshot({
            fullPage: false,
            type: 'webp',
            encoding: 'base64',
          })) as string;
          previewDataUrl = `data:image/webp;base64,${previewShot}`;
        } else {
          // Image Capture (WebP, PNG, JPG)
          const puppeteerFormat: 'png' | 'jpeg' | 'webp' =
            format === 'jpg' ? 'jpeg' : format === 'webp' ? 'webp' : 'png';

          const screenshotOptions: any = {
            fullPage: Boolean(fullPage),
            type: puppeteerFormat,
            encoding: 'base64',
          };

          if (puppeteerFormat !== 'png') {
            screenshotOptions.quality = Math.max(10, Math.min(100, Number(quality) || 85));
          }

          let base64Data = (await page.screenshot(screenshotOptions)) as string;

          // Fallback protection if fullPage exceeded texture limit
          if (!base64Data || base64Data.length === 0) {
            console.warn(`Aviso: captura fullPage retornou 0 bytes para ${url}, tentando fallback...`);
            base64Data = (await page.screenshot({
              fullPage: false,
              type: puppeteerFormat,
              encoding: 'base64',
              quality: puppeteerFormat !== 'png' ? Math.max(10, Math.min(100, Number(quality) || 85)) : undefined,
            })) as string;
          }

          if (!base64Data || base64Data.length === 0) {
            throw new Error('Chromium não conseguiu renderizar a imagem da página (tamanho 0 B).');
          }

          const mimeType = puppeteerFormat === 'jpeg' ? 'image/jpeg' : `image/${puppeteerFormat}`;
          dataUrl = `data:${mimeType};base64,${base64Data}`;
          previewDataUrl = dataUrl;
          byteSize = Math.round((base64Data.length * 3) / 4);
        }

        const durationMs = Date.now() - startTime;

        sendEvent('item_success', {
          index: i,
          url,
          fileName,
          format,
          byteSize,
          dimensions,
          durationMs,
          dataUrl,
          previewDataUrl,
          imgStats,
        });
      } catch (err: any) {
        sendEvent('item_error', {
          index: i,
          url,
          fileName: `error_${i + 1}.txt`,
          error: err?.message || 'Falha ao renderizar a página',
          durationMs: Date.now() - startTime,
        });
      } finally {
        if (page) {
          try {
            await page.close();
          } catch {}
        }
      }
    }

    sendEvent('complete', { timestamp: Date.now() });
    res.end();
  } catch (err: any) {
    sendEvent('fatal_error', { error: err?.message || 'Erro fatal no Chromium' });
    res.end();
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch {}
    }
  }
});

// Classic Batch ZIP Endpoint
app.post('/api/screenshot', async (req: Request, res: Response) => {
  const {
    urls,
    format = 'png',
    quality = 80,
    width = 1920,
    height = 1080,
    fullPage = true,
    enableAutoScroll = true,
    delayMs = 1200,
    heroWaitMs = 2000,
    stabilizeTextures = true,
    removeExcessGrain = false,
    hideCookieBanners = true,
    namingPattern = '[ordem]_[url]_[resolucao]',
    customHeaders = '',
    customCookies = '',
  } = req.body;

  if (!urls || !Array.isArray(urls) || urls.length === 0) {
    return res.status(400).json({ error: 'Nenhuma URL fornecida.' });
  }

  let browser: Browser | null = null;
  const zip = new JSZip();

  try {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
    });

    const parsedHeaders = parseCustomHeaders(customHeaders);

    for (let i = 0; i < urls.length; i++) {
      const rawUrl = urls[i];
      const url = normalizeUrl(rawUrl);
      if (!url) continue;

      let page: any = null;
      try {
        page = await browser.newPage();
        await page.setViewport({
          width: Number(width) || 1920,
          height: Number(height) || 1080,
        });

        if (Object.keys(parsedHeaders).length > 0) {
          await page.setExtraHTTPHeaders(parsedHeaders);
        }

        const parsedCookies = parseCustomCookies(customCookies, url);
        if (parsedCookies.length > 0) {
          try {
            await page.setCookie(...parsedCookies);
          } catch {}
        }

        try {
          await page.goto(url, { waitUntil: 'networkidle2', timeout: 35000 });
        } catch {
          await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
        }

        if (hideCookieBanners) {
          await dismissConsentOverlays(page);
        }

        await preparePageDOM(page);

        // Aguarda estabilização da seção Hero e fontes web
        await waitForHeroAndFonts(page, Number(heroWaitMs) || 2000);

        // Estabiliza texturas de fundo
        if (stabilizeTextures || removeExcessGrain) {
          await stabilizeBackgroundTextures(page, Boolean(stabilizeTextures), Boolean(removeExcessGrain));
        }

        if (enableAutoScroll) {
          await progressiveScrollAndHydrate(page, 20000);
          if (hideCookieBanners) {
            await dismissConsentOverlays(page);
          }
        }

        await waitForAllImagesDecoded(page, 6000);

        if (stabilizeTextures || removeExcessGrain) {
          await stabilizeBackgroundTextures(page, Boolean(stabilizeTextures), Boolean(removeExcessGrain));
        }
        await injectLazyLoadVisibilityStyles(page);

        if (delayMs > 0) {
          await new Promise((r) => setTimeout(r, Math.min(delayMs, 5000)));
        }

        const dimensions = await page.evaluate(() => ({
          pageWidth: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
          pageHeight: Math.max(document.documentElement.scrollHeight, document.body.scrollHeight),
        }));

        const fileName = formatCustomFileName({
          pattern: namingPattern,
          url,
          index: i,
          format,
          width: dimensions.pageWidth,
          height: dimensions.pageHeight,
        });

        if (format === 'pdf') {
          const pdfBuffer = await page.pdf({
            width: `${dimensions.pageWidth}px`,
            height: `${Math.max(1080, dimensions.pageHeight)}px`,
            printBackground: true,
            margin: { top: '0px', right: '0px', bottom: '0px', left: '0px' },
            pageRanges: '1',
          });
          zip.file(fileName, pdfBuffer);
        } else {
          const puppeteerFormat = format === 'jpg' ? 'jpeg' : format;
          const screenshotOptions: any = {
            fullPage: Boolean(fullPage),
            type: puppeteerFormat,
          };

          if (puppeteerFormat !== 'png') {
            screenshotOptions.quality = Number(quality) || 80;
          }

          let buffer = (await page.screenshot(screenshotOptions)) as unknown as Buffer;
          if (!buffer || buffer.length === 0) {
            buffer = (await page.screenshot({ fullPage: false, type: puppeteerFormat })) as unknown as Buffer;
          }
          zip.file(fileName, buffer);
        }
      } catch (err: any) {
        zip.file(`ERRO_${i + 1}.txt`, `Erro ao processar ${url}: ${err.message}`);
      } finally {
        if (page) {
          try {
            await page.close();
          } catch {}
        }
      }
    }

    const zipBuffer = await zip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    });

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=screenshots_${Date.now()}.zip`
    );
    res.send(zipBuffer);
  } catch (error: any) {
    console.error('Erro geral no endpoint ZIP:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message || 'Falha ao processar capturas' });
    }
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch {}
    }
  }
});

// ZIP Generator from client-captured base64 items (Fast instant download without re-crawling!)
app.post('/api/screenshot/pack-zip', async (req: Request, res: Response) => {
  const { items } = req.body;
  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Nenhum item para empacotar.' });
  }

  try {
    const zip = new JSZip();

    for (const item of items) {
      if (item.dataUrl) {
        const base64Content = item.dataUrl.split(',')[1];
        if (base64Content) {
          const buffer = Buffer.from(base64Content, 'base64');
          zip.file(item.fileName || `capture_${Date.now()}.${item.format || 'png'}`, buffer);
        }
      }
    }

    const zipBuffer = await zip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    });

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=screenshots_bundle_${Date.now()}.zip`
    );
    res.send(zipBuffer);
  } catch (err: any) {
    console.error('Erro ao empacotar zip:', err);
    res.status(500).json({ error: 'Falha ao gerar arquivo ZIP' });
  }
});

// Setup Vite middleware in dev or static files in production
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Bulk Screenshot App running at http://localhost:${PORT}`);
  });
}

startServer();
