import assert from "node:assert/strict";
import { renderHtmlToPdf } from "../server/render-pdf.mjs";

const pdf = await renderHtmlToPdf(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><style>@page{size:A4;margin:20mm}body{font-family:Arial,sans-serif}</style></head><body><h1>PDF server-side</h1><p>Documento imutável de homologação.</p></body></html>`);
assert.equal(pdf.subarray(0, 5).toString("ascii"), "%PDF-");
assert.ok(pdf.length > 1000, "PDF server-side vazio ou incompleto");
console.log(JSON.stringify({ ok: true, bytes: pdf.length, chromium: process.env.CHROMIUM_PATH || "auto" }, null, 2));
