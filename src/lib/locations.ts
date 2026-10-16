// Locais de execução múltiplos ficam em uma única coluna de texto
// (`local_execucao`), separados por "; ", para propagar sem alterar o schema
// em agendamento, OS, recorrência e certificados.
export function splitLocais(value: string): string[] {
  const seen = new Set<string>();
  return value
    .split(/[\n;]+/)
    .map((item) => item.trim())
    .filter((item) => {
      const key = item.toLowerCase();
      if (!item || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

export function joinLocais(values: string[]): string {
  return splitLocais(values.join("\n")).join("; ");
}
