import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { extractProposalPdfDeterministically } from "../server/proposal-ai.mjs";

const pdf = await readFile("docs/evidencias/p0-propostas/proposta-ciperprag-padrao-v5-ritmo.pdf");
const result = await extractProposalPdfDeterministically(pdf);
assert.ok(result.paginasAnalisadas > 0, "PDF sem paginas analisadas");
assert.ok(result.tabelasEncontradas >= 2, "Tabelas deterministicas nao identificadas");
assert.ok(result.linhasDeterministicas.flat().includes("Frequência Atividade programada"), "Cabecalho de frequencia nao preservado");
assert.ok(result.linhasDeterministicas.flat().includes("Controle Integrado de Pragas (CIP)"), "Linha comercial nao preservada");
console.log(JSON.stringify({ ok: true, paginas: result.paginasAnalisadas, tabelas: result.tabelasEncontradas, linhas: result.linhasDeterministicas.length }, null, 2));
