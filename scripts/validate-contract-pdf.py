from __future__ import annotations

import subprocess
import sys
import unicodedata
from pathlib import Path

from pypdf import PdfReader


ROOT = Path(__file__).resolve().parents[1]
PDFINFO = ROOT.parent.parent / ".."
DEFAULT_PDF = ROOT / "docs" / "evidencias" / "p0-contratos" / "contrato-ciperprag-padrao-v1.pdf"


def normalize_text(value: str) -> str:
    value = value.replace("\ufb01", "fi").replace("\ufb02", "fl")
    return unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode("ascii")


def run_pdfinfo(pdf_path: Path) -> str:
    candidates = [
        Path.home()
        / ".cache"
        / "codex-runtimes"
        / "codex-primary-runtime"
        / "dependencies"
        / "native"
        / "poppler"
        / "Library"
        / "bin"
        / "pdfinfo.exe",
        Path("pdfinfo"),
    ]
    for candidate in candidates:
        try:
            result = subprocess.run([str(candidate), str(pdf_path)], check=True, capture_output=True, text=True)
            return result.stdout
        except (FileNotFoundError, subprocess.CalledProcessError):
            continue
    raise RuntimeError("pdfinfo nao encontrado no runtime local.")


def main() -> int:
    pdf_path = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_PDF
    if not pdf_path.exists():
        raise FileNotFoundError(pdf_path)

    reader = PdfReader(str(pdf_path))
    pages = len(reader.pages)
    text = "\n".join(page.extract_text() or "" for page in reader.pages)
    plain = normalize_text(text)

    fonts: set[str] = set()
    for page in reader.pages:
        resources = page.get("/Resources") or {}
        font_dict = resources.get("/Font") or {}
        for font in font_dict.values():
            base_font = font.get_object().get("/BaseFont")
            if base_font:
                fonts.add(str(base_font))

    pdfinfo = run_pdfinfo(pdf_path)
    errors: list[str] = []

    if pages < 2:
        errors.append(f"Esperado contrato com ao menos 2 paginas, encontrado {pages}.")
    if "Tagged:          yes" not in pdfinfo:
        errors.append("PDF nao esta marcado semanticamente (Tagged: yes).")
    for page_number in range(1, pages + 1):
        if f"Pagina {page_number} de {pages}" not in plain:
            errors.append(f"Rodape ausente: Pagina {page_number} de {pages}.")
    for expected in [
        "CONTRATO DE PRESTACAO",
        "SERVICOS",
        "04 Servicos contratados",
        "E, por estarem de acordo",
        "Assinatura e carimbo",
    ]:
        if expected not in plain:
            errors.append(f"Texto esperado ausente: {expected}")
    for required_font in ["Montserrat-Regular", "Montserrat-Medium", "Montserrat-SemiBold", "Montserrat-Bold"]:
        if not any(required_font in font for font in fonts):
            errors.append(f"Fonte ausente/incorreta: {required_font}")

    if errors:
        print("VALIDACAO DO CONTRATO: FALHOU")
        for error in errors:
            print(f"- {error}")
        print("Fontes detectadas:", sorted(fonts))
        return 1

    print("VALIDACAO DO CONTRATO: OK")
    print(f"Paginas: {pages}")
    print("Fontes detectadas:", sorted(fonts))
    print("Tagged PDF: sim")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
