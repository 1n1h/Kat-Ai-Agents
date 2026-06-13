/**
 * Document conversion (server-only, Node runtime). Markdown → PDF / Word, and
 * CSV → Excel. Shared by the local file-download route (reads the matter dir)
 * and the cloud convert route (works from posted content, no filesystem).
 */
import PDFDocument from "pdfkit";
import { Document, HeadingLevel, Packer, Paragraph } from "docx";
import ExcelJS from "exceljs";

export const RAW_TYPES: Record<string, string> = {
  ".pdf": "application/pdf",
  ".txt": "text/plain; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".csv": "text/csv; charset=utf-8",
  ".json": "application/json",
  ".docx":
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xlsx":
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
};

/** strip inline markdown so converted documents read as prose */
const stripInline = (s: string) =>
  s
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .trim();

export function mdToPdf(md: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "LETTER",
      margins: { top: 72, bottom: 72, left: 72, right: 72 },
    });
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    for (const block of md.split(/\n{2,}/)) {
      const text = block.trim();
      if (!text) continue;
      const h = text.match(/^(#{1,3})\s+([\s\S]*)$/);
      if (h) {
        doc
          .moveDown(0.4)
          .font("Times-Bold")
          .fontSize(h[1].length === 1 ? 16 : h[1].length === 2 ? 14 : 12.5)
          .text(stripInline(h[2]));
        doc.moveDown(0.2);
      } else if (/^\s*[-*]\s+/.test(text)) {
        doc.font("Times-Roman").fontSize(12);
        doc.list(
          text.split(/\n/).map((l) => stripInline(l.replace(/^\s*[-*]\s+/, ""))),
          { bulletRadius: 1.5, textIndent: 16 },
        );
        doc.moveDown(0.4);
      } else {
        doc
          .font("Times-Roman")
          .fontSize(12)
          .text(stripInline(text.replace(/\n/g, " ")), {
            lineGap: 3,
            paragraphGap: 8,
            align: "left",
          });
      }
    }
    doc.end();
  });
}

export async function mdToDocx(md: string): Promise<Buffer> {
  const children: Paragraph[] = [];
  for (const block of md.split(/\n{2,}/)) {
    const text = block.trim();
    if (!text) continue;
    const h = text.match(/^(#{1,3})\s+([\s\S]*)$/);
    if (h) {
      children.push(
        new Paragraph({
          text: stripInline(h[2]),
          heading:
            h[1].length === 1
              ? HeadingLevel.HEADING_1
              : h[1].length === 2
                ? HeadingLevel.HEADING_2
                : HeadingLevel.HEADING_3,
        }),
      );
    } else if (/^\s*[-*]\s+/.test(text)) {
      for (const l of text.split(/\n/)) {
        children.push(
          new Paragraph({
            text: stripInline(l.replace(/^\s*[-*]\s+/, "")),
            bullet: { level: 0 },
          }),
        );
      }
    } else {
      children.push(
        new Paragraph({ text: stripInline(text.replace(/\n/g, " ")) }),
      );
    }
  }
  return Packer.toBuffer(new Document({ sections: [{ children }] }));
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQ) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cur += '"';
          i++;
        } else inQ = false;
      } else cur += ch;
    } else if (ch === '"') inQ = true;
    else if (ch === ",") {
      row.push(cur);
      cur = "";
    } else if (ch === "\n") {
      row.push(cur.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      cur = "";
    } else cur += ch;
  }
  if (cur !== "" || row.length) {
    row.push(cur.replace(/\r$/, ""));
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c !== ""));
}

export async function csvToXlsx(csv: string): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Sheet1");
  for (const r of parseCsv(csv)) {
    ws.addRow(
      r.map((c) => {
        const n = Number(c);
        return c !== "" && Number.isFinite(n) && /^[\d.-]+$/.test(c) ? n : c;
      }),
    );
  }
  if (ws.rowCount > 0) ws.getRow(1).font = { bold: true };
  return Buffer.from(await wb.xlsx.writeBuffer());
}
