# Relatório de evidências - Certificados

## Cenários gerados
- 01-ciperprag-com-produtos: Certificado de Garantia; certificado CERT-7303/2026; OS OS-2677; código público QV30-0O30; SHA-256 SHA-256: 08E597799288…ED0B52DA; validação https://fieldops-homologacao.atenza.digital/validar-certificado/QV30-0O30
- 02-ciperprag-sem-produtos: Certificado de Execução; certificado CERT-7304/2026; OS OS-2678; código público 9ZYD-TWOT; SHA-256 SHA-256: A93D0A3F9FC6…1A5B2FC7; validação https://fieldops-homologacao.atenza.digital/validar-certificado/9ZYD-TWOT
- 03-ciperprag-tres-fotos: Certificado de Higienização; certificado CERT-7305/2026; OS OS-2679; código público 4E4U-N5AM; SHA-256 SHA-256: 0B1EC93D52FE…43A58889; validação https://fieldops-homologacao.atenza.digital/validar-certificado/4E4U-N5AM
- 04-ciperprag-titulo-personalizado: Certificado Técnico de Saúde Ambiental; certificado CERT-7306/2026; OS OS-2680; código público JY53-CBXB; SHA-256 SHA-256: 3559DE1661D8…3BBCEBE6; validação https://fieldops-homologacao.atenza.digital/validar-certificado/JY53-CBXB
- 05-outro-tenant-com-logo: Certificado de Execução; certificado CERT-DEMO-001/2026; OS OS-DEMO-001; código público HHIS-SO0A; SHA-256 SHA-256: 2F2EF1648A66…2BD6A270; validação https://validar.atenza.digital/validar-certificado/HHIS-SO0A
- 06-outro-tenant-sem-logo: Certificado de Serviço; certificado CERT-DEMO-002/2026; OS OS-DEMO-002; código público AR65-LWM3; SHA-256 SHA-256: 7B190D6A9938…8A721806; validação https://validar.atenza.digital/validar-certificado/AR65-LWM3
- 07-ciperprag-assinatura-imagem: Certificado de Garantia; certificado CERT-7307/2026; OS OS-2681; código público 1DJ6-NZRM; SHA-256 SHA-256: 2BD8E579F1B1…0DA3B33F; validação https://fieldops-homologacao.atenza.digital/validar-certificado/1DJ6-NZRM
- 08-ciperprag-assinatura-linha: Certificado de Garantia; certificado CERT-7308/2026; OS OS-2682; código público DR9N-H8DF; SHA-256 SHA-256: B811E4FF0F1B…09A615DD; validação https://fieldops-homologacao.atenza.digital/validar-certificado/DR9N-H8DF
- 09-ciperprag-sem-assinatura: Certificado de Garantia; certificado CERT-7309/2026; OS OS-2683; código público AQW4-6F04; SHA-256 SHA-256: 6DED7D136E78…BE5D0D50; validação https://fieldops-homologacao.atenza.digital/validar-certificado/AQW4-6F04
- 10-ciperprag-com-licencas: Certificado de Garantia; certificado CERT-7310/2026; OS OS-2684; código público LZ8Y-AQOS; SHA-256 SHA-256: FEDC6D3C9379…95C059D5; validação https://fieldops-homologacao.atenza.digital/validar-certificado/LZ8Y-AQOS
- 11-ciperprag-sem-licencas: Certificado de Garantia; certificado CERT-7311/2026; OS OS-2685; código público K6O9-3ZAL; SHA-256 SHA-256: EB2F57386257…7CD908F3; validação https://fieldops-homologacao.atenza.digital/validar-certificado/K6O9-3ZAL
- 12-ciperprag-com-validade: Certificado de Garantia; certificado CERT-7312/2026; OS OS-2686; código público POW0-X7WE; SHA-256 SHA-256: FE0716600DBC…BDB45BBB; validação https://fieldops-homologacao.atenza.digital/validar-certificado/POW0-X7WE
- 13-ciperprag-sem-validade: Certificado de Garantia; certificado CERT-7313/2026; OS OS-2687; código público W6X3-MEJ3; SHA-256 SHA-256: E8F52AFB7DC8…5F158900; validação https://fieldops-homologacao.atenza.digital/validar-certificado/W6X3-MEJ3

## Cenários bloqueados por regra de emissão
- bloqueado-assinatura-obrigatoria: Emissão bloqueada quando a política exige assinatura por imagem e nenhuma assinatura foi configurada.
- bloqueado-responsavel-obrigatorio: Emissão bloqueada quando o responsável técnico é obrigatório e nenhum responsável foi configurado.

## Observações técnicas
- O template usa Montserrat incorporada por @font-face.
- O QR Code aponta para a URL pública com código curto de autenticação.
- A rastreabilidade exibe número do certificado, OS, data de execução, validade quando aplicável, código curto e impressão digital SHA-256 abreviada.
- O hash HSH permanece apenas como identificador legado interno; a impressão digital SHA-256 vem do snapshot transacional.
- Blocos de produtos, licenças, fotos, assinatura e validade são condicionais.
- Os PDFs individuais são gerados com `tagged: true` no Playwright/Chromium; o PDF consolidado de conferência visual pode perder a marcação estrutural ao ser mesclado por pypdf.
