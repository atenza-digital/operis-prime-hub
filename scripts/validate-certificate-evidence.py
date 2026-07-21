from __future__ import annotations

import json
import re
import shutil
from pathlib import Path

from pypdf import PdfReader, PdfWriter


ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "docs" / "evidencias" / "certificado_saas"
PUBLIC_DIR = ROOT / "docs" / "cliente" / "certificados_montserrat"
MANIFEST_PATH = OUT_DIR / "manifest.json"
COMBINED_PATH = PUBLIC_DIR / "certificados-montserrat-validacao-final.pdf"
RESULTS_PATH = OUT_DIR / "validation-results.json"
SAMPLE_PDF_PATH = PUBLIC_DIR / "certificado-ciperprag-amostra-final.pdf"
SAMPLE_PNG_PATH = PUBLIC_DIR / "certificado-ciperprag-amostra-final.png"


def normalize_text(value: str) -> str:
    replacements = {
        "\ufb01": "fi",
        "\ufb02": "fl",
        "\ufb03": "ffi",
        "\ufb04": "ffl",
    }
    normalized = value or ""
    for source, target in replacements.items():
        normalized = normalized.replace(source, target)
    return re.sub(r"\s+", " ", normalized).strip()


def comparable(value: str) -> str:
    return normalize_text(value).casefold()


def collect_fonts(page) -> set[str]:
    fonts: set[str] = set()

    def visit(resources):
        if not resources:
            return
        font_dict = resources.get("/Font") or {}
        for font in font_dict.values():
            font_obj = font.get_object()
            name = str(font_obj.get("/BaseFont", ""))
            if name:
                fonts.add(name)
        xobjects = resources.get("/XObject") or {}
        for xobject in xobjects.values():
            xobject_obj = xobject.get_object()
            visit(xobject_obj.get("/Resources"))

    visit(page.get("/Resources"))
    return fonts


def assert_contains(text: str, expected: str, failures: list[str], label: str) -> None:
    if expected and comparable(expected) not in comparable(text):
        failures.append(f"Ausente no texto extraído: {label} = {expected}")


def validate_result(item: dict) -> dict:
    pdf_path = Path(item["pdfPath"])
    reader = PdfReader(str(pdf_path))
    page_text = [normalize_text(page.extract_text() or "") for page in reader.pages]
    text = normalize_text(" ".join(page_text))
    fonts = sorted({font for page in reader.pages for font in collect_fonts(page)})
    failures: list[str] = []

    if len(reader.pages) != 1:
        failures.append(f"PDF individual deve ter 1 página, mas possui {len(reader.pages)}")
    if len(text) < 180:
        failures.append("Página com pouco conteúdo extraído, possível página vazia/quase vazia.")
    if not any("Montserrat" in font for font in fonts):
        failures.append(f"Montserrat não localizada nos recursos de fonte: {fonts}")
    if any(font and "Montserrat" not in font for font in fonts):
        failures.append(f"Fontes fora da família Montserrat encontradas: {fonts}")

    for label, expected in [
        ("rastreabilidade", item.get("traceabilityText", "")),
        ("cliente", item["client"]),
        ("CNPJ", item["cnpj"]),
        ("serviço", item["service"]),
        ("data de execução", item["executionDateBr"]),
        ("código público", item["publicCode"]),
        ("SHA-256 abreviado", item["snapshotFingerprint"]),
    ]:
        assert_contains(text, expected, failures, label)

    comparable_text = comparable(text)
    if "cert. cert" in comparable_text or "certificado certificado" in comparable_text:
        failures.append("Prefixo de certificado duplicado encontrado.")
    if "os os-" in comparable_text or "os os " in comparable_text:
        failures.append("Prefixo de OS duplicado encontrado.")
    if comparable("Versão 1") in comparable_text:
        failures.append("Versão documental visível indevidamente no rodapé do certificado.")

    if item.get("hasValidity"):
        assert_contains(text, "Período de validade", failures, "rótulo de validade")
        assert_contains(text, item.get("validityText", ""), failures, "período de validade")
    else:
        if comparable("Período de validade") in comparable_text:
            failures.append("Bloco de validade apareceu em cenário sem validade.")

    if item.get("hasProducts"):
        assert_contains(text, "Produtos Químicos Utilizados no Serviço", failures, "bloco de produtos")
    elif comparable("Produtos Químicos Utilizados no Serviço") in comparable_text:
        failures.append("Bloco de produtos apareceu em cenário sem produtos.")

    if item.get("hasLicenses"):
        assert_contains(text, "devidamente licenciada", failures, "bloco de licenças")
    elif comparable("devidamente licenciada") in comparable_text:
        failures.append("Bloco de licenças apareceu em cenário sem licenças.")

    if "template" in comparable_text or "fallback" in comparable_text or comparable("Responsável técnico não configurado") in comparable_text:
        failures.append("Termos internos/placeholder foram encontrados no PDF.")

    declaration_pattern = f"empresa {item['client']} recebeu a execução do serviço de {item['service']}"
    assert_contains(text, declaration_pattern, failures, "declaração transacional")

    return {
        "slug": item["slug"],
        "pdf": str(pdf_path),
        "pages": len(reader.pages),
        "fonts": fonts,
        "tagged": str(reader.trailer.get("/Root", {}).get("/MarkInfo", {}).get("/Marked", "")).lower() == "true",
        "textLength": len(text),
        "ok": not failures,
        "failures": failures,
    }


def write_combined_pdf(manifest: dict) -> None:
    writer = PdfWriter()
    for item in manifest["results"]:
        reader = PdfReader(item["pdfPath"])
        for page in reader.pages:
            writer.add_page(page)
    writer.add_metadata(
        {
            "/Title": "Validação da família de certificados",
            "/Author": "Atenza",
            "/Subject": "Certificados de homologação com rastreabilidade, QR Code e SHA-256",
            "/Keywords": "certificados, validação, homologação, pt-BR",
            "/Lang": "pt-BR",
        }
    )
    PUBLIC_DIR.mkdir(parents=True, exist_ok=True)
    with COMBINED_PATH.open("wb") as handle:
        writer.write(handle)

    png_dir = PUBLIC_DIR / "png"
    png_dir.mkdir(parents=True, exist_ok=True)
    for item in manifest["results"]:
        src = Path(item["pngPath"])
        if src.exists():
            shutil.copyfile(src, png_dir / f"{item['slug']}.png")

    if manifest["results"]:
        first = manifest["results"][0]
        sample_pdf = Path(first["pdfPath"])
        sample_png = Path(first["pngPath"])
        if sample_pdf.exists():
            shutil.copyfile(sample_pdf, SAMPLE_PDF_PATH)
        if sample_png.exists():
            shutil.copyfile(sample_png, SAMPLE_PNG_PATH)


def main() -> int:
    manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    validations = [validate_result(item) for item in manifest["results"]]
    write_combined_pdf(manifest)
    summary = {
        "ok": all(item["ok"] for item in validations),
        "generatedAt": manifest["generatedAt"],
        "combinedPdf": str(COMBINED_PATH),
        "samplePdf": str(SAMPLE_PDF_PATH),
        "samplePng": str(SAMPLE_PNG_PATH),
        "scenarios": len(validations),
        "passed": sum(1 for item in validations if item["ok"]),
        "failed": sum(1 for item in validations if not item["ok"]),
        "results": validations,
        "knownLimitations": [
            "O PDF consolidado é mesclado por pypdf para conferência visual e pode perder marcação Tagged; os PDFs individuais são emitidos pelo Chromium com tagged=true.",
            "A leitura física do QR Code em papel depende de conferência manual com celular, fora do ambiente automatizado local.",
        ],
    }
    RESULTS_PATH.write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    return 0 if summary["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
