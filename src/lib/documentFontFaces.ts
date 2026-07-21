import montserrat400 from "@/assets/fonts/documentos/montserrat/Montserrat-Regular.ttf";
import montserrat500 from "@/assets/fonts/documentos/montserrat/Montserrat-Medium.ttf";
import montserrat600 from "@/assets/fonts/documentos/montserrat/Montserrat-SemiBold.ttf";
import montserrat700 from "@/assets/fonts/documentos/montserrat/Montserrat-Bold.ttf";

export const montserratDocumentFontFaces = `
  @font-face { font-family: "Montserrat"; src: url("${montserrat400}") format("truetype"); font-style: normal; font-weight: 400; font-display: block; }
  @font-face { font-family: "Montserrat"; src: url("${montserrat500}") format("truetype"); font-style: normal; font-weight: 500; font-display: block; }
  @font-face { font-family: "Montserrat"; src: url("${montserrat600}") format("truetype"); font-style: normal; font-weight: 600; font-display: block; }
  @font-face { font-family: "Montserrat"; src: url("${montserrat700}") format("truetype"); font-style: normal; font-weight: 700; font-display: block; }
  @font-face { font-family: "Montserrat"; src: url("${montserrat700}") format("truetype"); font-style: normal; font-weight: 800; font-display: block; }
  @font-face { font-family: "Montserrat"; src: url("${montserrat700}") format("truetype"); font-style: normal; font-weight: 900; font-display: block; }
`;

export const documentTypographyCss = `
  ${montserratDocumentFontFaces}
  html,
  body,
  *,
  *::before,
  *::after {
    font-family: "Montserrat", sans-serif;
    font-variant-numeric: tabular-nums lining-nums;
  }
`;
