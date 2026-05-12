/**
 * Position-aware PDF text extraction using pdf.js-extract.
 *
 * Unlike pdf-parse which throws away x,y coordinates, this preserves
 * text positions and reconstructs proper reading order for multi-column
 * layouts. Resumes commonly use 2-column layouts (sidebar + main),
 * and naive extraction interleaves them into garbage.
 *
 * Algorithm:
 *   1. Extract all text items with x,y,width,height per page
 *   2. Group items into lines by y-coordinate proximity
 *   3. Detect column structure (cluster x-coordinates)
 *   4. If multi-column: read each column top-to-bottom, left-to-right
 *   5. If single-column: read top-to-bottom (standard)
 *   6. Join into clean text
 */

// Lazy-load pdf.js-extract (ESM-only module, must use dynamic import)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _PDFExtractClass: any = null;

async function getPDFExtract() {
  if (!_PDFExtractClass) {
    try {
      const mod = await import("pdf.js-extract");
      _PDFExtractClass = mod.PDFExtract;
    } catch {
      throw new Error("pdf.js-extract not available. Install it: npm install pdf.js-extract");
    }
  }
  return _PDFExtractClass;
}

// ============================================================
// TYPES
// ============================================================

interface TextItem {
  x: number;
  y: number;
  str: string;
  width: number;
  height: number;
  dir: string;
  font?: { name: string; size: number };
  hasEOL?: boolean;
}

interface PageData {
  info: { num: number; width: number; height: number };
  content: TextItem[];
}

export interface PDFExtractionResult {
  text: string;
  pageCount: number;
  columnsDetected: number; // max columns detected across all pages
  isMultiColumn: boolean;
  pageWidths: number[];
}

// ============================================================
// LINE GROUPING
// ============================================================

interface TextLine {
  y: number;       // representative y for the line
  items: TextItem[];
}

/**
 * Group text items into lines by y-coordinate proximity.
 * Items within `threshold` vertical pixels are on the same line.
 */
function groupIntoLines(items: TextItem[], threshold = 3): TextLine[] {
  if (items.length === 0) return [];

  // Sort by y (top to bottom), then x (left to right)
  const sorted = [...items].sort((a, b) => a.y - b.y || a.x - b.x);

  const lines: TextLine[] = [];
  let currentLine: TextLine = { y: sorted[0].y, items: [sorted[0]] };

  for (let i = 1; i < sorted.length; i++) {
    const item = sorted[i];
    if (Math.abs(item.y - currentLine.y) <= threshold) {
      currentLine.items.push(item);
    } else {
      // Sort items in current line by x before finalizing
      currentLine.items.sort((a, b) => a.x - b.x);
      lines.push(currentLine);
      currentLine = { y: item.y, items: [item] };
    }
  }
  // Don't forget last line
  currentLine.items.sort((a, b) => a.x - b.x);
  lines.push(currentLine);

  return lines;
}

// ============================================================
// COLUMN DETECTION
// ============================================================

/**
 * Detect column structure from text lines using x-coordinate clustering.
 *
 * Approach: Look at where lines START (left edge). If there are 2+ distinct
 * clusters of starting x-positions, it's multi-column.
 *
 * Returns column boundaries (x-ranges).
 */
function detectColumns(
  lines: TextLine[],
  pageWidth: number,
): { columns: Array<{ minX: number; maxX: number }>; isMultiColumn: boolean } {
  if (lines.length < 5) {
    return { columns: [{ minX: 0, maxX: pageWidth }], isMultiColumn: false };
  }

  // Collect left-edge x positions of all items
  const leftEdges: number[] = [];
  for (const line of lines) {
    for (const item of line.items) {
      if (item.str.trim().length > 0) {
        leftEdges.push(Math.round(item.x));
      }
    }
  }

  if (leftEdges.length < 10) {
    return { columns: [{ minX: 0, maxX: pageWidth }], isMultiColumn: false };
  }

  // Build histogram of left-edge positions (bin size = 10px)
  const binSize = 10;
  const bins = new Map<number, number>();
  for (const x of leftEdges) {
    const bin = Math.floor(x / binSize) * binSize;
    bins.set(bin, (bins.get(bin) || 0) + 1);
  }

  // Find peaks in histogram (bins with significant counts)
  const threshold = leftEdges.length * 0.05; // at least 5% of items start here
  const peaks: number[] = [];
  for (const [bin, count] of bins) {
    if (count >= threshold) {
      peaks.push(bin);
    }
  }
  peaks.sort((a, b) => a - b);

  // Merge peaks that are close together (within 30px = same column indent)
  const mergedPeaks: number[] = [];
  for (const peak of peaks) {
    if (mergedPeaks.length === 0 || peak - mergedPeaks[mergedPeaks.length - 1] > 30) {
      mergedPeaks.push(peak);
    }
  }

  // Need 2+ distinct starting positions with significant gap to be multi-column
  if (mergedPeaks.length < 2) {
    return { columns: [{ minX: 0, maxX: pageWidth }], isMultiColumn: false };
  }

  // Check if the gap between peaks is significant (>25% of page width)
  // This distinguishes indentation from actual columns
  const gap = mergedPeaks[1] - mergedPeaks[0];
  if (gap < pageWidth * 0.25) {
    return { columns: [{ minX: 0, maxX: pageWidth }], isMultiColumn: false };
  }

  // Build column boundaries
  const columns: Array<{ minX: number; maxX: number }> = [];
  for (let i = 0; i < mergedPeaks.length; i++) {
    const minX = mergedPeaks[i] - binSize;
    const maxX = i < mergedPeaks.length - 1
      ? mergedPeaks[i + 1] - binSize
      : pageWidth;
    columns.push({ minX, maxX });
  }

  return { columns, isMultiColumn: columns.length >= 2 };
}

// ============================================================
// READING ORDER RECONSTRUCTION
// ============================================================

/**
 * Reconstruct text from lines respecting column layout.
 * Multi-column: read column 1 fully (top→bottom), then column 2, etc.
 * Single-column: read top→bottom, left→right (standard).
 */
function reconstructText(
  lines: TextLine[],
  columns: Array<{ minX: number; maxX: number }>,
  isMultiColumn: boolean,
): string {
  if (!isMultiColumn) {
    // Simple: each line → join items with spaces
    return lines.map((line) => {
      return joinLineItems(line.items);
    }).join("\n");
  }

  // Multi-column: assign each line's items to columns, then read column by column
  const columnTexts: string[][] = columns.map(() => []);

  for (const line of lines) {
    // Group items by which column they belong to
    const itemsByColumn: TextItem[][] = columns.map(() => []);

    for (const item of line.items) {
      const centerX = item.x + item.width / 2;
      let colIdx = 0;
      for (let i = 0; i < columns.length; i++) {
        if (centerX >= columns[i].minX) {
          colIdx = i;
        }
      }
      itemsByColumn[colIdx].push(item);
    }

    // Add text from each column's items for this line
    for (let i = 0; i < columns.length; i++) {
      if (itemsByColumn[i].length > 0) {
        columnTexts[i].push(joinLineItems(itemsByColumn[i]));
      }
    }
  }

  // Join columns sequentially (column 1 text, then column 2 text, etc.)
  return columnTexts
    .map((lines) => lines.join("\n"))
    .join("\n\n");
}

/**
 * Join text items on the same line, inserting spaces based on gaps.
 */
function joinLineItems(items: TextItem[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0].str;

  let result = items[0].str;
  for (let i = 1; i < items.length; i++) {
    const prev = items[i - 1];
    const curr = items[i];
    const gap = curr.x - (prev.x + prev.width);

    // Large gap = likely a tab/column separator
    if (gap > 15) {
      result += "    " + curr.str;
    } else if (gap > 2) {
      result += " " + curr.str;
    } else {
      // Tight or overlapping — no extra space
      result += curr.str;
    }
  }
  return result;
}

// ============================================================
// MAIN EXTRACTOR
// ============================================================

/**
 * Extract text from a PDF buffer with position-aware multi-column support.
 *
 * This is the replacement for pdf-parse. It preserves x,y coordinates
 * from pdf.js and uses them to reconstruct proper reading order.
 */
export async function extractPDFText(buffer: Buffer): Promise<PDFExtractionResult> {
  const PDFExtract = await getPDFExtract();
  const extractor = new PDFExtract();

  const data = await extractor.extractBuffer(buffer, {
    normalizeWhitespace: true,
    // Don't disable combine — pdf.js merges adjacent runs smartly
  });

  const pages: PageData[] = data.pages as unknown as PageData[];
  const pageTexts: string[] = [];
  let maxColumns = 1;
  const pageWidths: number[] = [];

  for (const page of pages) {
    const width = page.info.width;
    pageWidths.push(width);

    // Filter out empty/whitespace-only items
    const items = page.content.filter(
      (item: TextItem) => item.str.trim().length > 0
    );

    if (items.length === 0) {
      pageTexts.push("");
      continue;
    }

    // Group into lines
    const lines = groupIntoLines(items);

    // Detect columns
    const { columns, isMultiColumn } = detectColumns(lines, width);
    if (columns.length > maxColumns) maxColumns = columns.length;

    // Reconstruct reading order
    const pageText = reconstructText(lines, columns, isMultiColumn);
    pageTexts.push(pageText);
  }

  const text = pageTexts.join("\n\n");

  return {
    text,
    pageCount: pages.length,
    columnsDetected: maxColumns,
    isMultiColumn: maxColumns >= 2,
    pageWidths,
  };
}
