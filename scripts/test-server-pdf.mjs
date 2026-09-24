import assert from "node:assert/strict";
import { renderHtmlToPdf } from "../server/render-pdf.mjs";
import { PDFDocument, PDFName } from 'pdf-lib';

const pdf = await renderHtmlToPdf(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Validação de emissão</title><meta name="author" content="Empresa de teste"><meta name="subject" content="Acentuação e rastreabilidade"><style>@page{size:A4;margin:20mm}body{font-family:Arial,sans-serif}</style></head><body><h1>PDF server-side</h1><p>Documento imutável de homologação. R$ 1.234,56 OS-1234567890.</p><p style="font-weight:500">Peso médio</p><p style="font-weight:600">Peso seminegrito</p></body></html>`);
assert.equal(pdf.subarray(0, 5).toString("ascii"), "%PDF-");
assert.ok(pdf.length > 1000, "PDF server-side vazio ou incompleto");
const parsed=await PDFDocument.load(pdf);
assert.equal(parsed.getTitle(),'Validação de emissão');
assert.equal(parsed.getAuthor(),'Empresa de teste');
assert.ok(parsed.catalog.get(PDFName.of('StructTreeRoot')));
assert.equal(parsed.getPageCount(),1);
for (const page of parsed.getPages()) {
  const fonts=page.node.Resources().lookup(PDFName.of('Font'));
  for (const [,ref] of fonts.entries()) {
    const font=parsed.context.lookup(ref);
    assert.match(font.get(PDFName.of('BaseFont')).toString(),/Montserrat/);
  }
}
console.log(JSON.stringify({ ok: true, bytes: pdf.length, chromium: process.env.CHROMIUM_PATH || "auto" }, null, 2));
