/**
 * Document conversion (server-only, Node runtime). Markdown → PDF / Word, and
 * CSV → Excel. Renders headings, bold, bullets, and Markdown tables so a
 * structured legal memo keeps its shape on download. Shared by the local
 * file-download route and the cloud convert route (works from posted content).
 */
import PDFDocument from "pdfkit";
import {
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
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

/** strip inline markdown so converted text reads as prose */
const stripInline = (s: string) =>
  s
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .trim();

// ── line-based markdown parser ───────────────────────────────────────────
/** Split a table row "| a | b |" into ["a","b"] (outer pipes dropped). */
const splitRow = (l: string): string[] =>
  l
    .replace(/^\s*\|/, "")
    .replace(/\|\s*$/, "")
    .split("|")
    .map((c) => c.trim());

/** A table separator row, e.g. "| --- | :--: |". */
const isSeparator = (l: string): boolean => {
  const t = l.trim();
  return t.includes("|") && t.includes("-") && /^[\s|:-]+$/.test(t);
};

type Block =
  | { kind: "heading"; level: number; text: string }
  | { kind: "table"; rows: string[][] }
  | { kind: "list"; items: string[] }
  | { kind: "para"; text: string };

/**
 * Parse Markdown line-by-line into structural blocks. Works whether sections
 * are separated by blank lines or only single newlines (some models omit the
 * blank line), so headings and tables are never flattened into raw `##`/`|`
 * prose in the exported PDF/Word file.
 */
function parseBlocks(md: string): Block[] {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let para: string[] = [];
  const flush = () => {
    if (para.length) {
      blocks.push({ kind: "para", text: para.join(" ").trim() });
      para = [];
    }
  };
  for (let i = 0; i < lines.length; ) {
    const line = lines[i].trim();
    if (!line) {
      flush();
      i++;
      continue;
    }
    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      flush();
      blocks.push({
        kind: "heading",
        level: Math.min(h[1].length, 3),
        text: h[2].trim(),
      });
      i++;
      continue;
    }
    // table: a pipe row immediately followed by a separator row
    if (
      line.includes("|") &&
      i + 1 < lines.length &&
      isSeparator(lines[i + 1])
    ) {
      flush();
      const rows: string[][] = [splitRow(line)];
      i += 2;
      while (i < lines.length && lines[i].trim() && lines[i].includes("|")) {
        rows.push(splitRow(lines[i].trim()));
        i++;
      }
      blocks.push({ kind: "table", rows });
      continue;
    }
    // bullet list
    if (/^[-*]\s+/.test(line)) {
      flush();
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        items.push(lines[i].trim().replace(/^[-*]\s+/, "").trim());
        i++;
      }
      blocks.push({ kind: "list", items });
      continue;
    }
    para.push(line);
    i++;
  }
  flush();
  return blocks;
}

/** Word runs that honor **bold** within a line. */
const docxRuns = (text: string): TextRun[] => {
  const clean = text
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/`([^`]+)`/g, "$1");
  const runs: TextRun[] = [];
  const re = /\*\*([^*]+)\*\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(clean))) {
    if (m.index > last)
      runs.push(
        new TextRun(clean.slice(last, m.index).replace(/\*([^*]+)\*/g, "$1")),
      );
    runs.push(new TextRun({ text: m[1], bold: true }));
    last = re.lastIndex;
  }
  if (last < clean.length)
    runs.push(new TextRun(clean.slice(last).replace(/\*([^*]+)\*/g, "$1")));
  return runs.length ? runs : [new TextRun(clean)];
};

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

    for (const b of parseBlocks(md)) {
      if (b.kind === "heading") {
        doc
          .moveDown(0.4)
          .font("Times-Bold")
          .fontSize(b.level === 1 ? 16 : b.level === 2 ? 14 : 12.5)
          .text(stripInline(b.text));
        doc.moveDown(0.2);
      } else if (b.kind === "table") {
        const [header, ...body] = b.rows;
        doc.moveDown(0.3);
        for (const row of body) {
          // first cell as a bold heading, remaining cells as labeled lines
          doc.font("Times-Bold").fontSize(11.5).text(stripInline(row[0] ?? ""));
          for (let i = 1; i < row.length; i++) {
            const label = stripInline(header?.[i] ?? "");
            doc
              .font("Times-Roman")
              .fontSize(11)
              .text(
                `${label ? `${label}: ` : ""}${stripInline(row[i] ?? "")}`,
                { lineGap: 2, paragraphGap: 3 },
              );
          }
          doc.moveDown(0.35);
        }
      } else if (b.kind === "list") {
        doc.font("Times-Roman").fontSize(12);
        doc.list(
          b.items.map((it) => stripInline(it)),
          { bulletRadius: 1.5, textIndent: 16 },
        );
        doc.moveDown(0.4);
      } else {
        doc
          .font("Times-Roman")
          .fontSize(12)
          .text(stripInline(b.text), {
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
  const children: (Paragraph | Table)[] = [];
  for (const b of parseBlocks(md)) {
    if (b.kind === "heading") {
      children.push(
        new Paragraph({
          children: docxRuns(b.text),
          heading:
            b.level === 1
              ? HeadingLevel.HEADING_1
              : b.level === 2
                ? HeadingLevel.HEADING_2
                : HeadingLevel.HEADING_3,
        }),
      );
    } else if (b.kind === "table") {
      children.push(
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: b.rows.map(
            (cells, ri) =>
              new TableRow({
                tableHeader: ri === 0,
                children: cells.map(
                  (c) =>
                    new TableCell({
                      shading: ri === 0 ? { fill: "E6E1D3" } : undefined,
                      children: [
                        new Paragraph({
                          children:
                            ri === 0
                              ? [new TextRun({ text: stripInline(c), bold: true })]
                              : docxRuns(c),
                        }),
                      ],
                    }),
                ),
              }),
          ),
        }),
      );
      children.push(new Paragraph(""));
    } else if (b.kind === "list") {
      for (const it of b.items) {
        children.push(
          new Paragraph({ children: docxRuns(it), bullet: { level: 0 } }),
        );
      }
    } else {
      children.push(new Paragraph({ children: docxRuns(b.text) }));
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
