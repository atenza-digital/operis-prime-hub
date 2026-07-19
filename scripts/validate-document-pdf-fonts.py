from __future__ import annotations

import json
import re
import sys
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


def main() -> int:
    if len(sys.argv) != 2:
        print("Uso: validate-document-pdf-fonts.py <arquivo.pdf>", file=sys.stderr)
        return 2

    pdf_path = Path(sys.argv[1])
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

    result = {
        "pdf": str(pdf_path),
        "fonts": fonts,
        "normalizedFonts": normalized,
        "ok": not errors,
        "errors": errors,
    }
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 1 if errors else 0


if __name__ == "__main__":
    raise SystemExit(main())
