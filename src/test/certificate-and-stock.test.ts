import { describe, expect, it } from "vitest";
import { assertCertificateSource, resolveCertificateSource } from "../../server/certificate-rules.mjs";
import { resolveCertificateWatermarkUrl } from "../components/CertificadoImpressao";

describe("origem transacional do certificado", () => {
  const order = {
    cliente_id: "CLI-001",
    cliente: "Nome gravado na OS",
    cnpj: "00.000.000/0000-00",
    servico: "Serviço gravado na OS",
    tipo: "sanitario",
    servico_catalogo_id: "SRV-001",
    contrato_id: null,
  };

  it("prioriza cliente e serviço do banco sobre texto legado da OS", () => {
    const source = resolveCertificateSource({
      order,
      customer: {
        id: "CLI-001",
        razao_social: "Cliente oficial LTDA",
        cnpj: "11.222.333/0001-44",
        endereco: "Rua Principal, 10",
        bairro: "Centro",
        municipio: "Parauapebas",
        uf: "PA",
      },
      service: {
        id: "SRV-001",
        nome: "Coleta de água em bebedouro",
        tipo: "sanitario",
      },
    });

    expect(source.clientName).toBe("Cliente oficial LTDA");
    expect(source.clientCnpj).toBe("11.222.333/0001-44");
    expect(source.serviceName).toBe("Coleta de água em bebedouro");
    expect(source.serviceId).toBe("SRV-001");
    expect(source.clientAddress).toBe("Rua Principal, 10, Centro, Parauapebas-PA");
  });

  it("usa a razão social mesmo quando o cliente possui nome fantasia", () => {
    const source = resolveCertificateSource({
      order,
      customer: {
        id: "CLI-001",
        razao_social: "Razão Social Oficial LTDA",
        nome_fantasia: "Nome Fantasia",
        cnpj: "11.222.333/0001-44",
      },
      service: { id: "SRV-001", nome: "Serviço técnico", tipo: "sanitario" },
    });

    expect(source.clientName).toBe("Razão Social Oficial LTDA");
  });

  it("aceita certificado de atendimento avulso quando o serviço está no catálogo", () => {
    const source = resolveCertificateSource({
      order,
      customer: { id: "CLI-001", razao_social: "Cliente avulso", cnpj: "11.222.333/0001-44" },
      service: { id: "SRV-001", nome: "Serviço avulso", tipo: "manutencao" },
    });

    expect(() => assertCertificateSource(source)).not.toThrow();
    expect(source.contractId).toBeNull();
  });

  it("bloqueia emissão sem serviço identificável no catálogo", () => {
    const source = resolveCertificateSource({
      order: { ...order, servico_catalogo_id: null },
      customer: { id: "CLI-001", razao_social: "Cliente", cnpj: "11.222.333/0001-44" },
      service: null,
    });

    expect(() => assertCertificateSource(source)).toThrow(/identificação do serviço/);
  });

  it("não usa a logo documental completa como marca-d'água", () => {
    expect(
      resolveCertificateWatermarkUrl(
        { documentLogoLightUrl: "data:image/png;base64,logo", logoPrincipalUrl: "data:image/png;base64,logo" },
        {},
      ),
    ).toBe("");
    expect(resolveCertificateWatermarkUrl({ brandIconUrl: "data:image/png;base64,icone" }, {})).toBe(
      "data:image/png;base64,icone",
    );
  });
});
