from __future__ import annotations

import re
import sys
from pathlib import Path

from pypdf import PdfReader


EXPECTED_TITLE = "Proposta PC-58/2026"
EXPECTED_AUTHOR = "CIPERPRAG Controle de Pragas e Serviços LTDA"
EXPECTED_SUBJECT = "Serviços continuados de saúde ambiental e higienização predial."
EXPECTED_CONDITIONS = [
    "Pagamento a negociar conforme aceite comercial.",
    "Prazo de pagamento: 30 dias após medição e faturamento.",
    "Validade da proposta: 30 dias corridos.",
]


def normalize(value: str) -> str:
    value = (value or "").replace("ﬁ", "fi").replace("ﬂ", "fl")
    return re.sub(r"\s+", " ", value).strip()


def page_documental_text(page_text: str) -> str:
    text = normalize(page_text)
    text = re.sub(r"Proposta PC-58/2026\s*·\s*Versão 1", "", text)
    text = re.sub(r"Página\s+\d+\s+de\s+\d+", "", text)
    text = re.sub(r"PC-58/2026", "", text)
    text = re.sub(r"Versão 1\s*·\s*03 de março de 2026", "", text)
    text = re.sub(r"Versão 1", "", text)
    return normalize(text)


def collect_font_names(reader: PdfReader) -> set[str]:
    names: set[str] = set()
    for page in reader.pages:
        resources = page.get("/Resources")
        if not resources:
            continue
        fonts = resources.get("/Font")
        if not fonts:
            continue
        for font_ref in fonts.values():
            font = font_ref.get_object()
            for key in ("/BaseFont", "/FontName"):
                value = font.get(key)
                if value:
                    names.add(str(value))
            descriptor = font.get("/FontDescriptor")
            if descriptor:
                descriptor = descriptor.get_object()
                value = descriptor.get("/FontName")
                if value:
                    names.add(str(value))
    return names


def main() -> int:
    if len(sys.argv) != 2:
        print("Uso: validate-proposal-pdf.py <arquivo.pdf>", file=sys.stderr)
        return 2

    pdf_path = Path(sys.argv[1])
    reader = PdfReader(str(pdf_path))
    errors: list[str] = []
    warnings: list[str] = []

    expected_pages = 4
    if len(reader.pages) != expected_pages:
        errors.append(f"Esperado PDF com {expected_pages} páginas reais, encontrado: {len(reader.pages)}.")

    for index, page in enumerate(reader.pages, start=1):
        text = page.extract_text() or ""
        content = page_documental_text(text)
        if len(content) < 120:
            errors.append(f"Página {index} parece conter apenas cabeçalho/rodapé ou conteúdo insuficiente.")
        expected_footer = f"Página {index} de {expected_pages}"
        if expected_footer not in text:
            errors.append(f"Rodapé esperado ausente na página {index}: {expected_footer}.")

    full_text = "\n".join(page.extract_text() or "" for page in reader.pages)
    normalized_full_text = normalize(full_text)
    expected_sections = [
        "01 Unidades e endereços contemplados",
        "02 Escopo técnico proposto",
        "03 Frequência e cronograma",
        "04 Mobilização e documentação",
        "05 Responsabilidades",
        "06 Proposta comercial",
        "07 Serviços spot ou itens não inclusos",
        "08 Condições comerciais",
        "09 Premissas técnicas",
        "10 Aceite da proposta",
    ]
    positions = []
    for section in expected_sections:
        position = normalized_full_text.find(section)
        if position < 0:
            errors.append(f"Seção obrigatória não encontrada: {section}")
        positions.append(position)
    if all(position >= 0 for position in positions) and positions != sorted(positions):
        errors.append("Ordem semântica das seções não está sequencial de 01 a 10.")

    cronograma_note = (
        "O cronograma poderá ser ajustado em razão de acesso, condições operacionais, "
        "segurança ou prioridade definida pelo contratante, sem prejuízo da frequência contratada."
    )
    note_position = normalized_full_text.find(cronograma_note)
    section_03 = normalized_full_text.find("03 Frequência e cronograma")
    section_04 = normalized_full_text.find("04 Mobilização e documentação")
    if note_position < 0:
        errors.append("Nota do cronograma não encontrada no PDF.")
    elif not (section_03 < note_position < section_04):
        errors.append("Nota do cronograma deve ficar dentro da seção 03, antes da seção 04.")

    if "Documento comercial" in normalized_full_text:
        errors.append("Rodapé antigo 'Documento comercial' ainda aparece no PDF.")
    if ".;" in normalized_full_text or ";." in normalized_full_text:
        errors.append("Condições comerciais ainda têm separadores inválidos como '.;' ou ';.'.")
    for condition in EXPECTED_CONDITIONS:
        if condition not in normalized_full_text:
            errors.append(f"Condição comercial não encontrada como item independente: {condition}")
    if "Atenza FieldOps" in normalized_full_text:
        errors.append("Texto/metadado visual da plataforma apareceu dentro do conteúdo extraído do PDF.")

    metadata = reader.metadata or {}
    checks = {
        "/Title": EXPECTED_TITLE,
        "/Author": EXPECTED_AUTHOR,
        "/Subject": EXPECTED_SUBJECT,
        "/Version": "1",
    }
    for key, expected in checks.items():
        value = metadata.get(key)
        if value != expected:
            errors.append(f"Metadado {key} inválido: {value!r}; esperado {expected!r}.")

    lang = reader.trailer["/Root"].get("/Lang")
    if str(lang) != "pt-BR":
        errors.append(f"Idioma /Lang inválido: {lang!r}; esperado 'pt-BR'.")

    fonts = collect_font_names(reader)
    if not any("Montserrat" in font for font in fonts):
        errors.append(f"Nenhuma fonte Montserrat detectada nos recursos do PDF. Fontes: {sorted(fonts)}")
    if any("Thin" in font for font in fonts):
        errors.append(
            "Fonte Montserrat com nome interno Thin detectada no PDF. "
            "A proposta deve usar os arquivos locais Montserrat Regular, Medium, SemiBold e Bold."
        )

    mark_info = reader.trailer["/Root"].get("/MarkInfo")
    tagged = bool(mark_info and mark_info.get_object().get("/Marked"))
    if not tagged:
        errors.append("PDF não está marcado semanticamente (/MarkInfo /Marked true ausente).")

    if errors:
        print("VALIDAÇÃO DA PROPOSTA: FALHOU")
        for error in errors:
            print(f"- {error}")
        for warning in warnings:
            print(f"Aviso: {warning}")
        print(f"Fontes detectadas: {sorted(fonts)}")
        print(f"Tagged PDF: {'sim' if tagged else 'não'}")
        return 1

    print("VALIDAÇÃO DA PROPOSTA: OK")
    print(f"Páginas: {len(reader.pages)}")
    print(f"Fontes detectadas: {sorted(fonts)}")
    print(f"Tagged PDF: {'sim' if tagged else 'não'}")
    if not tagged:
        print("Observação: Chromium/Playwright gerou PDF selecionável, mas não marcado semanticamente.")
    for warning in warnings:
        print(f"Aviso: {warning}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
