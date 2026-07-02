import PDFDocument from "pdfkit";

/** Gera um PDF simples (título + tabela) e devolve o Buffer completo. */
export async function buildPdfReport(params: {
  title: string;
  subtitle?: string;
  columns: { label: string; width: number }[];
  rows: (string | number)[][];
  footer?: string;
}): Promise<Buffer> {
  const doc = new PDFDocument({ margin: 40, size: "A4" });
  const chunks: Buffer[] = [];
  doc.on("data", (chunk) => chunks.push(chunk));

  const done = new Promise<Buffer>((resolve) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
  });

  doc.font("Helvetica-Bold").fontSize(16).text(params.title);
  if (params.subtitle) {
    doc.font("Helvetica").fontSize(10).fillColor("#64748b").text(params.subtitle);
  }
  doc.moveDown(1);
  doc.fillColor("#0f172a");

  const startX = doc.x;
  let y = doc.y;
  const rowHeight = 20;
  const pageBottom = doc.page.height - doc.page.margins.bottom;

  const drawHeader = () => {
    doc.font("Helvetica-Bold").fontSize(9).fillColor("#334155");
    let x = startX;
    for (const col of params.columns) {
      doc.text(col.label, x, y, { width: col.width, ellipsis: true });
      x += col.width;
    }
    y += rowHeight;
    doc
      .moveTo(startX, y - 4)
      .lineTo(x, y - 4)
      .strokeColor("#cbd5e1")
      .stroke();
    doc.fillColor("#0f172a").font("Helvetica").fontSize(9);
  };

  drawHeader();

  for (const row of params.rows) {
    if (y + rowHeight > pageBottom) {
      doc.addPage();
      y = doc.y;
      drawHeader();
    }
    let x = startX;
    row.forEach((cell, i) => {
      const col = params.columns[i];
      doc.text(String(cell ?? ""), x, y, { width: col.width, ellipsis: true });
      x += col.width;
    });
    y += rowHeight;
  }

  if (params.rows.length === 0) {
    doc.font("Helvetica-Oblique").fillColor("#64748b").text("Sem dados para o período selecionado.", startX, y);
  }

  if (params.footer) {
    doc
      .fontSize(8)
      .fillColor("#94a3b8")
      .text(params.footer, startX, pageBottom - 15, { width: 500 });
  }

  doc.end();
  return done;
}

export function pdfResponse(filename: string, buffer: Buffer): Response {
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
