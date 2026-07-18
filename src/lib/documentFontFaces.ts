import notoSans400 from "@fontsource/noto-sans/files/noto-sans-latin-ext-400-normal.woff2";
import notoSans600 from "@fontsource/noto-sans/files/noto-sans-latin-ext-600-normal.woff2";
import notoSans700 from "@fontsource/noto-sans/files/noto-sans-latin-ext-700-normal.woff2";
import montserrat400 from "@/assets/fonts/documentos/montserrat/Montserrat-Regular.ttf";
import montserrat500 from "@/assets/fonts/documentos/montserrat/Montserrat-Medium.ttf";
import montserrat600 from "@/assets/fonts/documentos/montserrat/Montserrat-SemiBold.ttf";
import montserrat700 from "@/assets/fonts/documentos/montserrat/Montserrat-Bold.ttf";

export const notoSansFontFaces = `
  @font-face { font-family: "Noto Sans"; src: url("${notoSans400}") format("woff2"); font-style: normal; font-weight: 400; font-display: swap; }
  @font-face { font-family: "Noto Sans"; src: url("${notoSans600}") format("woff2"); font-style: normal; font-weight: 600; font-display: swap; }
  @font-face { font-family: "Noto Sans"; src: url("${notoSans700}") format("woff2"); font-style: normal; font-weight: 700; font-display: swap; }
`;

export const montserratDocumentFontFaces = `
  @font-face { font-family: "Montserrat"; src: url("${montserrat400}") format("truetype"); font-style: normal; font-weight: 400; font-display: swap; }
  @font-face { font-family: "Montserrat"; src: url("${montserrat500}") format("truetype"); font-style: normal; font-weight: 500; font-display: swap; }
  @font-face { font-family: "Montserrat"; src: url("${montserrat600}") format("truetype"); font-style: normal; font-weight: 600; font-display: swap; }
  @font-face { font-family: "Montserrat"; src: url("${montserrat700}") format("truetype"); font-style: normal; font-weight: 700; font-display: swap; }
  @font-face { font-family: "Montserrat"; src: url("${montserrat700}") format("truetype"); font-style: normal; font-weight: 800; font-display: swap; }
  @font-face { font-family: "Montserrat"; src: url("${montserrat700}") format("truetype"); font-style: normal; font-weight: 900; font-display: swap; }
  @font-face { font-family: "Montserrat"; src: url("${montserrat700}") format("truetype"); font-style: italic; font-weight: 700; font-display: swap; }
  @font-face { font-family: "Montserrat"; src: url("${montserrat700}") format("truetype"); font-style: italic; font-weight: 800; font-display: swap; }
  @font-face { font-family: "Montserrat"; src: url("${montserrat700}") format("truetype"); font-style: italic; font-weight: 900; font-display: swap; }
`;
