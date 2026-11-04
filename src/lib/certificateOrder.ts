import type { CertificadoApp } from "@/lib/api";

// Mais recente primeiro. Certificados emitidos juntos (mesma OS e mesmo
// instante) aparecem em sequência crescente de TAG: TAG-01, TAG-02, ...
export function sortCertificates<T extends Pick<CertificadoApp, "emitidoEm" | "tagEquipamentoServico" | "osNumero" | "hash">>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const byDate = String(b.emitidoEm || "").localeCompare(String(a.emitidoEm || ""));
    if (byDate !== 0) return byDate;
    const byOs = String(b.osNumero || "").localeCompare(String(a.osNumero || ""), "pt-BR", { numeric: true });
    if (byOs !== 0) return byOs;
    const byTag = String(a.tagEquipamentoServico || "").localeCompare(String(b.tagEquipamentoServico || ""), "pt-BR", { numeric: true, sensitivity: "base" });
    if (byTag !== 0) return byTag;
    return String(a.hash).localeCompare(String(b.hash));
  });
}
