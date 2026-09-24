import { defineConfig } from 'vite';
import fs from 'node:fs';
import path from 'node:path';

export default defineConfig({
  resolve: { alias: { '@': path.resolve('src') } },
  plugins: [{
    name: 'embedded-document-fonts',
    enforce: 'pre',
    load(id) {
      if (!id.replaceAll('\\', '/').endsWith('/src/lib/documentFontFaces.ts')) return;
      const names = { 400: 'Regular', 500: 'Medium', 600: 'SemiBold', 700: 'Bold', 800: 'Bold', 900: 'Bold' };
      const faces = Object.entries(names).map(([weight, name]) => {
        const data = fs.readFileSync(`src/assets/fonts/documentos/montserrat/Montserrat-${name}.ttf`).toString('base64');
        return `@font-face{font-family:Montserrat;src:url(data:font/ttf;base64,${data}) format('truetype');font-weight:${weight};font-display:block}`;
      }).join('\n');
      return `export const montserratDocumentFontFaces=${JSON.stringify(faces)}; export const documentTypographyCss=montserratDocumentFontFaces+"html,body,*,*::before,*::after{font-family:Montserrat,sans-serif;font-variant-numeric:tabular-nums lining-nums}";`;
    },
  }],
  build: {
    ssr: 'server/document-entry.tsx',
    outDir: 'server/generated',
    emptyOutDir: true,
    rollupOptions: { output: { entryFileNames: 'documents.js' } },
  },
});
