import fs from 'node:fs';
import { chromium } from 'playwright-core';
import { PDFDocument } from 'pdf-lib';

export function resolveChromiumExecutable() {
  const candidates = [process.env.CHROMIUM_PATH,
    process.platform === 'win32' ? `${process.env.ProgramFiles || 'C:\\Program Files'}\\Google\\Chrome\\Application\\chrome.exe` : null,
    process.platform === 'win32' ? `${process.env.LOCALAPPDATA || ''}\\Google\\Chrome\\Application\\chrome.exe` : null,
    '/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome'];
  const result = candidates.filter(Boolean).find(p => fs.existsSync(p));
  if (!result) throw new Error('Chromium não encontrado para renderização documental.');
  return result;
}

export async function renderHtmlToPdf(html) {
  const { documentTypographyCss } = await import('./generated/documents.js');
  const browser = await chromium.launch({ executablePath: resolveChromiumExecutable(), headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(30_000);
    // Document assets must be snapshotted uploads, never requests to private services.
    await page.route('**/*', route => route.request().url().startsWith('data:') ? route.continue() : route.abort());
    // App CSS may contain interface fonts with browser-only asset URLs.
    // The PDF always uses the bundled, embedded documentary font registry.
    await page.setContent(html.replace(/@font-face\s*\{[^}]*\}/gi, ''), { waitUntil: 'load' });
    await page.addStyleTag({ content: documentTypographyCss + '\nhtml,body,*,*::before,*::after{font-family:Montserrat,sans-serif!important}' });
    await page.evaluate(async () => {
      for (const weight of [400,500,600,700]) {
        const faces = await document.fonts.load(`${weight} 16px Montserrat`).catch(() => { throw new Error(`Falha ao carregar Montserrat ${weight}.`); });
        if (!faces.length || faces.some(f => f.status !== 'loaded') || !document.fonts.check(`${weight} 16px Montserrat`)) throw new Error(`Montserrat ${weight} não carregou.`);
      }
      await document.fonts.ready;
      await Promise.all(Array.from(document.images).map(img => img.decode().catch(() => { throw new Error(`Imagem indisponível: ${img.alt || 'imagem documental'}`); })));
      if (Array.from(document.images).some(img => !img.naturalWidth)) throw new Error('Imagem documental não carregada.');
    });
    const metadata = await page.evaluate(() => ({
      title: document.title,
      author: document.querySelector('meta[name="author"]')?.getAttribute('content') || '',
      subject: document.querySelector('meta[name="description"],meta[name="subject"]')?.getAttribute('content') || '',
    }));
    const bytes = await page.pdf({ preferCSSPageSize: true, format: 'A4', printBackground: true, tagged: true });
    const pdf = await PDFDocument.load(bytes, { updateMetadata: false });
    pdf.setTitle(metadata.title); pdf.setAuthor(metadata.author); pdf.setSubject(metadata.subject); pdf.setLanguage('pt-BR');
    // Only metadata is updated; pages, embedded fonts and the structure tree are preserved.
    return Buffer.from(await pdf.save());
  } finally {
    await browser.close();
  }
}
