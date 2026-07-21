from __future__ import annotations

import sys
from datetime import datetime, timezone
from pathlib import Path

from pypdf import PdfReader, PdfWriter
from pypdf.generic import NameObject, TextStringObject


def pdf_date(value: datetime) -> str:
    return value.strftime("D:%Y%m%d%H%M%S+00'00'")


def main() -> int:
    if len(sys.argv) != 2:
        print("Uso: patch-proposal-pdf-metadata.py <arquivo.pdf>", file=sys.stderr)
        return 2

    pdf_path = Path(sys.argv[1])
    reader = PdfReader(str(pdf_path))
    writer = PdfWriter()
    writer.clone_document_from_reader(reader)

    emitted_at = datetime(2026, 3, 3, 12, 0, 0, tzinfo=timezone.utc)
    writer.add_metadata(
        {
            "/Title": "Proposta PC-58/2026",
            "/Author": "CIPERPRAG Controle de Pragas e Serviços LTDA",
            "/Subject": "Serviços continuados de saúde ambiental e higienização predial.",
            "/Keywords": "proposta, versão 1, emissão 03/03/2026, pt-BR",
            "/Creator": "CIPERPRAG Controle de Pragas e Serviços LTDA",
            "/Producer": "CIPERPRAG Controle de Pragas e Serviços LTDA",
            "/CreationDate": pdf_date(emitted_at),
            "/ModDate": pdf_date(emitted_at),
            "/Version": "1",
        }
    )
    writer._root_object.update({NameObject("/Lang"): TextStringObject("pt-BR")})

    tmp_path = pdf_path.with_suffix(".tmp.pdf")
    with tmp_path.open("wb") as output:
        writer.write(output)
    tmp_path.replace(pdf_path)
    print(f"Metadados atualizados: {pdf_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
