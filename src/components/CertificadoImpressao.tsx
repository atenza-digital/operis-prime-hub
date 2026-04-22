import { useMemo } from "react";
import { QRCodeSVG } from "qrcode.react";
import { CertificadoApp, addDays, getOrdemById } from "@/lib/appStore";
import { licencas } from "@/data/mockData";
import logoCiperprag from "@/assets/logo_ciperprag_certificado.png";
import brasaoPrefeitura from "@/assets/brasao_prefeitura_parauapebas.png";
import assinatura from "@/assets/assinatura_certificado.png";

interface Props {
  cert: CertificadoApp;
}

function fmtDate(d: string) {
  if (!d) return "—";
  return new Date(d + "T12:00:00").toLocaleDateString("pt-BR");
}

// Produtos padrão por tipo de serviço se não tiver detalhes
function getProdutosTabela(cert: CertificadoApp) {
  if (cert.produtosDetalhados && cert.produtosDetalhados.length > 0) {
    return cert.produtosDetalhados;
  }
  if (cert.produtosQuimicos && cert.produtosQuimicos.length > 0) {
    return cert.produtosQuimicos.map(nome => ({
      nome,
      grupoQuimico: "—",
      qtUso: "—",
      diluente: "—",
      volAplicado: "—",
      combate: "—",
      antidoto: "Anti-histamínico e tratamento sintomático",
    }));
  }
  return [];
}

export default function CertificadoImpressao({ cert }: Props) {
  const dataValidade = useMemo(
    () => cert.validadeDias > 0 ? addDays(cert.dataExecucao, cert.validadeDias) : null,
    [cert]
  );
  const produtos = useMemo(() => getProdutosTabela(cert), [cert]);
  const verifyUrl = `https://ciperprag.com.br/verificar/${cert.hash}`;
  // Busca fotos da OS vinculada (não duplica no cert para poupar localStorage)
  const fotos = useMemo(() => getOrdemById(cert.osId)?.fotos ?? [], [cert.osId]);

  return (
    <div
      id="certificado-print"
      className="bg-white text-black"
      style={{
        fontFamily: "'Montserrat', sans-serif",
        maxWidth: "210mm",
        margin: "0 auto",
        padding: "10mm 12mm",
        fontSize: "9pt",
        lineHeight: 1.4,
      }}
    >
      {/* ── VALIDADE ── */}
      <div style={{ textAlign: "center", marginBottom: 8, fontWeight: 700, fontSize: "10pt", border: "2px solid #166534", padding: "4px 8px", display: "inline-block", width: "100%", boxSizing: "border-box" }}>
        Período de validade: {fmtDate(cert.dataExecucao)} á {dataValidade ? fmtDate(dataValidade) : "Indeterminado"}
      </div>

      {/* ── TÍTULO ── */}
      <div style={{ textAlign: "center", margin: "10px 0 6px" }}>
        <div style={{ fontSize: "15pt", fontStyle: "italic", fontWeight: 700, letterSpacing: 1 }}>
          CERTIFICADO DE GARANTIA
        </div>
      </div>

      {/* ── LOGOS ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "8px 0 10px", gap: 8 }}>
        <img src={logoCiperprag} alt="Ciperprag" style={{ height: 70, objectFit: "contain" }} />
        {cert.clienteLogoUrl ? (
          <img src={cert.clienteLogoUrl} alt="Cliente" style={{ height: 60, objectFit: "contain", maxWidth: 180 }} />
        ) : (
          <div style={{ height: 60, width: 180, border: "1px dashed #ccc", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, color: "#999" }}>
            Logo do cliente
          </div>
        )}
      </div>

      {/* ── DADOS DO CLIENTE ── */}
      <div style={{ border: "1px solid #333", padding: "6px 8px", marginBottom: 6 }}>
        <div style={{ fontWeight: 700, fontSize: "11pt" }}>{cert.clienteNome}</div>
        <div>{cert.clienteNome}, CNPJ: &nbsp;{cert.clienteCnpj}</div>
        {cert.clienteEndereco && <div>{cert.clienteEndereco}</div>}
      </div>

      {/* ── LOCAL ── */}
      <div style={{ border: "1px solid #333", padding: "6px 8px", marginBottom: 6, fontWeight: 700, fontSize: "11pt", textAlign: "center" }}>
        {cert.localExecucao}
      </div>

      {/* ── TABELA PRODUTOS QUÍMICOS ── */}
      {produtos.length > 0 && (
        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 8, fontSize: "8pt" }}>
          <thead>
            <tr style={{ background: "#f0f0f0" }}>
              {["NOME", "GRUPO QUIMICO", "QT. USO", "DILUENTE", "VOL. APLICADO", "COMBATE", "ANTÍDOTO"].map(h => (
                <th key={h} style={{ border: "1px solid #333", padding: "4px 5px", fontWeight: 700, textAlign: "center" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {produtos.map((p, i) => (
              <tr key={i}>
                <td style={{ border: "1px solid #333", padding: "3px 5px", fontWeight: 600 }}>{p.nome}</td>
                <td style={{ border: "1px solid #333", padding: "3px 5px", textAlign: "center" }}>{p.grupoQuimico || "—"}</td>
                <td style={{ border: "1px solid #333", padding: "3px 5px", textAlign: "center" }}>{p.qtUso || "—"}</td>
                <td style={{ border: "1px solid #333", padding: "3px 5px", textAlign: "center" }}>{p.diluente || "—"}</td>
                <td style={{ border: "1px solid #333", padding: "3px 5px", textAlign: "center" }}>{p.volAplicado || "—"}</td>
                <td style={{ border: "1px solid #333", padding: "3px 5px", textAlign: "center" }}>{p.combate || "—"}</td>
                <td style={{ border: "1px solid #333", padding: "3px 5px", textAlign: "center" }}>{p.antidoto || "Anti-histamínico e tratamento sintomático"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* ── FIXAR ── */}
      <div style={{ textAlign: "center", fontWeight: 700, fontSize: "10pt", marginBottom: 8, letterSpacing: 2 }}>
        <span style={{ textDecoration: "underline" }}>FIXAR</span>{" "}
        <span style={{ fontStyle: "italic" }}>OBRIGATORIAMENTE</span>{" "}
        <span style={{ textDecoration: "underline" }}>EM LOCAL VI</span>
        <span style={{ fontStyle: "italic", textDecoration: "underline" }}>SÍ</span>
        <span style={{ textDecoration: "underline" }}>VEL</span>
      </div>

      {/* ── LICENÇAS ── */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 8, fontSize: "7.5pt" }}>
        <thead>
          <tr style={{ background: "#166534", color: "#fff" }}>
            <th colSpan={7} style={{ border: "1px solid #166534", padding: "5px 6px", textAlign: "center", fontWeight: 700 }}>
              ESTA EMPRESA ENCONTRA-SE DEVIDAMENTE LICENCIADA NOS SEGUINTES ORGÃOS
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={{ border: "1px solid #333", padding: "3px 5px", textAlign: "center" }}>
              <strong>CERTIFICADO</strong><br />{cert.numero}
            </td>
            <td style={{ border: "1px solid #333", padding: "3px 5px", textAlign: "center" }}>
              <strong>MTRR:</strong><br />151012245873
            </td>
            <td style={{ border: "1px solid #333", padding: "3px 5px", textAlign: "center" }}>
              <strong>MEIO AMBIENTE:</strong><br />Nº102/2024
            </td>
            <td style={{ border: "1px solid #333", padding: "3px 5px", textAlign: "center" }}>
              <strong>C.R.02:</strong><br />{licencas.cr02}
            </td>
            <td style={{ border: "1px solid #333", padding: "3px 5px", textAlign: "center" }}>
              <strong>CTR02:</strong><br />1657521/2024
            </td>
            <td style={{ border: "1px solid #333", padding: "3px 5px", textAlign: "center" }}>
              <strong>ALVARÁ:</strong><br />{licencas.alvara}
            </td>
            <td style={{ border: "1px solid #333", padding: "3px 5px", textAlign: "center" }}>
              <strong>VIG. SANITÁRIA:</strong><br />{licencas.vigilanciaSanitaria}
            </td>
          </tr>
        </tbody>
      </table>

      <div style={{ textAlign: "center", fontWeight: 700, fontSize: "8.5pt", marginBottom: 4 }}>A FIXAR EM LOCAL VIZIVEL</div>

      {/* ── CIPERPRAG WATERMARK LINES ── */}
      {[...Array(3)].map((_, i) => (
        <div key={i} style={{ textAlign: "center", fontWeight: 700, fontSize: "7pt", color: "#555", marginBottom: 2 }}>
          CIPERPRAG SERVIÇOS LTDA CNPJ: 15.722.292/0001-43
        </div>
      ))}

      {/* ── TEXTO CERTIFICAMOS ── */}
      <div style={{ margin: "10px 0 6px", fontSize: "9pt", textAlign: "justify" }}>
        Certificamos para os devidos fins, que a empresa <strong>{cert.clienteNome}</strong>, foi realizado o serviço de <strong>{cert.servico}</strong>,
      </div>

      {/* ── BRASÃO + LOGO ── */}
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 24, margin: "8px 0" }}>
        <img src={brasaoPrefeitura} alt="Brasão" style={{ height: 80, objectFit: "contain" }} />
        <img src={logoCiperprag} alt="Ciperprag" style={{ height: 60, objectFit: "contain" }} />
      </div>

      {/* ── ENDEREÇOS ── */}
      <div style={{ textAlign: "center", fontSize: "8pt", marginBottom: 4 }}>
        <strong>CIPERPRAG SERVIÇOS LTDA CNPJ: 15.722.292/0001-43</strong>
      </div>
      <div style={{ textAlign: "center", fontSize: "7.5pt", marginBottom: 6, color: "#333" }}>
        Rua Topázio Qd 11 Lote 03, Vale dos Carajás, Parauapebas – PA &nbsp;|&nbsp; Rua Tiradentes, nº 190 – Centro, Rondon Do Pará – PA
      </div>

      {/* ── CONCLUSÃO ── */}
      <div style={{ fontSize: "9pt", textAlign: "justify", marginBottom: 8 }}>
        conforme as leis e normas do município exigidas pela (ANVISA) na RDC 652/2022.
      </div>

      {/* ── FOTOS ── */}
      {fotos && fotos.length > 0 && (
        <div style={{ display: "flex", gap: 8, marginBottom: 10, justifyContent: "center" }}>
          {fotos.map((f, i) => (
            <img key={i} src={f} alt={`Evidência ${i + 1}`}
              style={{ width: "30%", maxWidth: 160, height: 110, objectFit: "cover", border: "1px solid #ccc", borderRadius: 4 }} />
          ))}
        </div>
      )}

      {/* ── QR CODE + HASH ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderTop: "1px solid #ccc", paddingTop: 8, marginBottom: 10 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: "7.5pt", color: "#555", marginBottom: 2 }}>CÓDIGO DE VALIDAÇÃO</div>
          <div style={{ fontFamily: "monospace", fontSize: "13pt", fontWeight: 700, color: "#166534" }}>{cert.hash}</div>
          <div style={{ fontSize: "7pt", color: "#777", maxWidth: 280, marginTop: 4 }}>
            Este certificado pode ser verificado através do QR Code ou do código hash acima.
            Documento com validade de {cert.validadeDias} dias a partir da data de execução.
          </div>
        </div>
        <div style={{ border: "1px solid #ccc", padding: 6, borderRadius: 4, background: "#fff" }}>
          <QRCodeSVG value={verifyUrl} size={90} level="H" />
        </div>
      </div>

      {/* ── ASSINATURA ── */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", marginBottom: 8 }}>
        <img src={assinatura} alt="Assinatura" style={{ height: 60, objectFit: "contain" }} />
        <div style={{ borderTop: "1px solid #333", width: 220, marginTop: 2 }} />
        <div style={{ fontSize: "8pt", fontWeight: 600, marginTop: 3 }}>{licencas.responsavelExecucao}</div>
        <div style={{ fontSize: "7.5pt", color: "#555" }}>{licencas.cargoResponsavel}</div>
        <div style={{ fontSize: "7.5pt", color: "#555" }}>CIPERPRAG SERVIÇOS LTDA</div>
      </div>

      {/* ── RODAPÉ ── */}
      <div style={{ borderTop: "2px solid #166534", paddingTop: 5, textAlign: "center", fontSize: "7pt", color: "#666" }}>
        {licencas.empresa} · CNPJ {licencas.cnpj} · Alvará {licencas.alvara} · Documento gerado automaticamente
      </div>
    </div>
  );
}
