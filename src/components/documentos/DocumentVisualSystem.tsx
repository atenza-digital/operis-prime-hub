import type { CSSProperties, ReactNode } from "react";

export const DOCUMENT_VISUAL_SYSTEM_VERSION = "Sistema Visual de Documentos — Versão 1";

export type DocumentOrientation = "portrait" | "landscape";

export type DocumentChromeProps = {
  documentLabel: string;
  documentVersion: string;
  page: number;
  totalPages: number;
  logoSrc?: string;
  logoAlt?: string;
  primaryColor: string;
  darkColor?: string;
  firstPageDate?: string;
};

export const documentPageClass =
  "box-border flex flex-col bg-white font-proposal text-[9.35pt] leading-[1.3] text-slate-950";

export function documentPageStyle(orientation: DocumentOrientation = "portrait", breakAfter = true): CSSProperties {
  return {
    width: orientation === "portrait" ? "210mm" : "297mm",
    height: orientation === "portrait" ? "297mm" : "210mm",
    padding: "16mm 18mm",
    breakAfter: breakAfter ? "page" : undefined,
    overflow: "hidden",
  };
}

export function DocumentHeader({
  documentLabel,
  documentVersion,
  logoSrc,
  logoAlt = "Logo da empresa emissora",
  primaryColor,
  darkColor = "#1f2933",
  firstPageDate,
}: Omit<DocumentChromeProps, "page" | "totalPages">) {
  return (
    <header className="border-b pb-[9pt]" style={{ borderColor: primaryColor }}>
      <div className="grid grid-cols-[auto_1fr] items-center gap-[22mm]">
        {logoSrc ? <img src={logoSrc} alt={logoAlt} className="h-[15mm] w-[44mm] object-contain object-left" /> : null}
        <div className="text-right">
          <p className="text-[9.5pt] font-semibold" style={{ color: darkColor }}>{documentLabel}</p>
          <p className="mt-[2pt] text-[8.5pt] font-medium text-slate-500">
            {firstPageDate ? `${documentVersion} · ${firstPageDate}` : documentVersion}
          </p>
        </div>
      </div>
    </header>
  );
}

export function DocumentFooter({ documentLabel, documentVersion, page, totalPages }: Pick<DocumentChromeProps, "documentLabel" | "documentVersion" | "page" | "totalPages">) {
  return (
    <footer className="mt-[10pt] flex h-[12mm] shrink-0 items-center justify-between border-t pt-[6pt] text-[8pt] font-medium text-slate-500" style={{ borderColor: "#d8dee8" }}>
      <span>{documentLabel} · {documentVersion}</span>
      <span>Página {page} de {totalPages}</span>
    </footer>
  );
}

export function DocumentSectionTitle({ number, title, compact = false, primaryColor, darkColor = "#1f2933" }: { number: string; title: string; compact?: boolean; primaryColor: string; darkColor?: string }) {
  return (
    <h2 className={`${compact ? "mb-[6pt] mt-[14pt] pb-[4pt]" : "mb-[8pt] mt-[18pt] pb-[5pt]"} flex items-end gap-[7pt] border-b text-[10.5pt] font-bold`} style={{ borderColor: "#d8dee8", color: darkColor }}>
      <span className="text-[12pt] font-bold" style={{ color: primaryColor }}>{number}</span>
      <span>{title}</span>
    </h2>
  );
}

export function DocumentMetadataBox({ children }: { children: ReactNode }) {
  return <section className="rounded-[8px] border border-slate-200 bg-white px-[11pt] py-[9pt]">{children}</section>;
}

export function DocumentObservationBox({ title = "Observações", children, primaryColor, darkColor = "#1f2933" }: { title?: string; children: ReactNode; primaryColor: string; darkColor?: string }) {
  return (
    <section className="rounded-[7px] px-[10pt] py-[8pt]" style={{ backgroundColor: `${primaryColor}14` }}>
      <h3 className="text-[9.5pt] font-semibold" style={{ color: darkColor }}>{title}</h3>
      <div className="mt-[4pt] text-left leading-[1.25]">{children}</div>
    </section>
  );
}

export function DocumentSignatureBlock({ left, right }: { left: ReactNode; right: ReactNode }) {
  return (
    <section className="mt-[18pt] break-inside-avoid text-center text-[8.8pt]">
      <div className="grid grid-cols-2 items-start gap-[18mm]">
        <div className="flex min-h-[32mm] flex-col">{left}</div>
        <div className="flex min-h-[32mm] flex-col">{right}</div>
      </div>
    </section>
  );
}
