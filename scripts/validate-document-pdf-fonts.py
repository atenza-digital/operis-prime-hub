from __future__ import annotations

import json
import re
import sys
from argparse import ArgumentParser
from pathlib import Path

from pypdf import PdfReader


FORBIDDEN = (
    "NotoSans",
    "Noto Sans",
    "Arial",
    "Roboto",
    "Times",
    "Consolas",
    "LiberationSans",
    "Liberation Sans",
    "Courier",
)

REQUIRED_HINTS = ("Montserrat",)


def collect_fonts(reader: PdfReader) -> set[str]:
    fonts: set[str] = set()

    def walk_resources(resources) -> None:
        if not resources:
            return
        font_dict = resources.get("/Font")
        if font_dict:
            for font_ref in font_dict.values():
                font = font_ref.get_object()
                base_font = str(font.get("/BaseFont", "")).lstrip("/")
                if base_font:
                    fonts.add(base_font)
                descriptor = font.get("/FontDescriptor")
                if descriptor:
                    descriptor_obj = descriptor.get_object()
                    descriptor_font = str(descriptor_obj.get("/FontName", "")).lstrip("/")
                    if descriptor_font:
                        fonts.add(descriptor_font)

        xobjects = resources.get("/XObject")
        if xobjects:
            for xobject_ref in xobjects.values():
                xobject = xobject_ref.get_object()
                walk_resources(xobject.get("/Resources"))

    for page in reader.pages:
        walk_resources(page.get("/Resources"))

    return fonts


def normalize_font_name(name: str) -> str:
    return re.sub(r"^[A-Z]{6}\+", "", name)


def validate_pdf(pdf_path: Path) -> dict:
    reader = PdfReader(str(pdf_path))
    fonts = sorted(collect_fonts(reader))
    normalized = sorted({normalize_font_name(font) for font in fonts})

    errors: list[str] = []
    if not fonts:
        errors.append("Nenhuma fonte encontrada nos recursos do PDF.")
    if not any(any(required in font for required in REQUIRED_HINTS) for font in normalized):
        errors.append(f"Montserrat nao encontrada no PDF. Fontes: {normalized}")
    forbidden_found = [font for font in normalized for forbidden in FORBIDDEN if forbidden.lower() in font.lower()]
    if forbidden_found:
        errors.append(f"Fontes fallback proibidas encontradas: {sorted(set(forbidden_found))}")
    non_montserrat = [font for font in normalized if not any(required in font for required in REQUIRED_HINTS)]
    if non_montserrat:
        errors.append(f"Fontes fora da familia Montserrat encontradas: {non_montserrat}")

    return {
        "pdf": str(pdf_path),
        "fonts": fonts,
        "normalizedFonts": normalized,
        "ok": not errors,
        "errors": errors,
    }


def resolve_inputs(paths: list[str]) -> list[Path]:
    pdfs: list[Path] = []
    for raw_path in paths:
        path = Path(raw_path)
        if path.is_dir():
            pdfs.extend(sorted(path.rglob("*.pdf")))
        elif path.suffix.lower() == ".pdf":
            pdfs.append(path)
        else:
            raise ValueError(f"Entrada nao e PDF nem diretorio: {path}")
    return pdfs


def write_report(report_path: Path, results: list[dict]) -> None:
    total = len(results)
    passed = sum(1 for item in results if item["ok"])
    failed = total - passed
    lines = [
        "# Auditoria de fontes documentais",
        "",
        "Critério: todo PDF validado deve usar somente Montserrat incorporada e não pode conter fontes de fallback como NotoSans, Arial, Roboto, Times, Consolas, Liberation Sans ou Courier.",
        "",
        f"- PDFs auditados: {total}",
        f"- Aprovados: {passed}",
        f"- Reprovados: {failed}",
        "",
        "| PDF | Resultado | Fontes normalizadas | Observações |",
        "| --- | --- | --- | --- |",
    ]
    for item in results:
        status = "OK" if item["ok"] else "ERRO"
        fonts = ", ".join(item["normalizedFonts"]) or "-"
        errors = "<br>".join(item["errors"]) if item["errors"] else "-"
        lines.append(f"| `{item['pdf']}` | {status} | {fonts} | {errors} |")
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> int:
    parser = ArgumentParser(description="Valida se PDFs documentais usam somente Montserrat incorporada.")
    parser.add_argument("paths", nargs="+", help="Arquivos PDF ou diretorios para auditar.")
    parser.add_argument("--report", help="Caminho opcional para salvar relatorio Markdown.")
    args = parser.parse_args()

    try:
        pdf_paths = resolve_inputs(args.paths)
    except ValueError as error:
        print(str(error), file=sys.stderr)
        return 2

    if not pdf_paths:
        print("Nenhum PDF encontrado.", file=sys.stderr)
        return 2

    results = [validate_pdf(path) for path in pdf_paths]
    if args.report:
        write_report(Path(args.report), results)

    output = results[0] if len(results) == 1 else {
        "total": len(results),
        "ok": all(item["ok"] for item in results),
        "failed": [item for item in results if not item["ok"]],
        "results": results,
    }
    print(json.dumps(output, ensure_ascii=False, indent=2))
    return 0 if all(item["ok"] for item in results) else 1


if __name__ == "__main__":
    raise SystemExit(main())
