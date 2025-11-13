// utils/parseDocx.ts
import { XMLParser } from "fast-xml-parser";
import JSZip from "jszip";

/**
 * Parse a .docx (Office Open XML) file to plain text.
 */
export async function parseDocxToText(arrayBuffer: ArrayBuffer): Promise<string> {
  const zip = await JSZip.loadAsync(arrayBuffer);
  const docFile = zip.file("word/document.xml");
  if (!docFile) return "";

  const xml = await docFile.async("text");
  const parser = new XMLParser({
    ignoreDeclaration: true,
    ignoreAttributes: false,
    removeNSPrefix: true,
  });
  const parsed = parser.parse(xml);
  const paragraphs: string[] = [];

  const body = parsed?.document?.body;
  const ps = Array.isArray(body?.p) ? body.p : body?.p ? [body.p] : [];

  for (const p of ps) {
    const runs = Array.isArray(p?.r) ? p.r : p?.r ? [p.r] : [];
    let textLine = "";
    for (const r of runs) {
      const t = r?.t ?? r?.["w:t"];
      if (typeof t === "string") textLine += t;
      else if (Array.isArray(t)) textLine += t.join("");
      else if (t?.["#text"]) textLine += t["#text"];
    }
    paragraphs.push(textLine);
  }

  return paragraphs.join("\n").trim();
}