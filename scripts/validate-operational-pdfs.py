"""Validate and render PDFs downloaded from the real operational API."""
import json
import pathlib
import sys
import pymupdf

folder = pathlib.Path(sys.argv[1])
results = []
for path in sorted(folder.glob('*.pdf')):
    document = pymupdf.open(path)
    assert document.page_count, f'{path.name}: empty PDF'
    catalog = document.xref_object(document.pdf_catalog())
    assert '/StructTreeRoot' in catalog and '/Lang' in catalog, f'{path.name}: missing tags/language'
    assert document.metadata.get('author'), f'{path.name}: missing author'
    assert '\ufffd' not in json.dumps(document.metadata, ensure_ascii=False), f'{path.name}: corrupt metadata'
    fonts = set()
    for index, page in enumerate(document):
        text = page.get_text()
        assert len(text.strip()) > 80, f'{path.name} page {index+1}: blank or footer-only page'
        if path.name.startswith('certificado'):
            assert document.page_count == 1
            assert 'Cliente QA LTDA' in text
            assert path.stem.replace('certificado-', '') in text
        if path.name == 'medicao.pdf':
            assert f'Página {index+1} de {document.page_count}' in text, 'Incorrect measurement pagination'
            if 'OS /' in text:
                assert 'Higienização de bebedouro' in text, 'Table header repeated without any service row'
        for font in page.get_fonts():
            xref, _, _, name, *_ = font
            assert 'Montserrat' in name and '+' in name, f'{path.name}: unexpected/unsubset font {name}'
            assert document.extract_font(xref)[3], f'{path.name}: font not embedded {name}'
            fonts.add(name)
        page.get_pixmap(matrix=pymupdf.Matrix(1.5, 1.5)).save(folder / f'{path.stem}-pagina-{index+1}.png')
    results.append({'file': path.name, 'pages': document.page_count, 'fonts': sorted(fonts), 'tagged': True, 'metadata': document.metadata})
assert len(results) >= 7, 'Expected five certificates, OS and measurement'
(folder / 'validacao-pdfs.json').write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding='utf-8')
print(json.dumps({'ok': True, 'files': len(results), 'pages': sum(r['pages'] for r in results)}, indent=2))
