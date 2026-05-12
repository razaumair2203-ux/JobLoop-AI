/**
 * Test: Compare pdf.js-extract (position-aware) vs pdf-parse (flat)
 * against actual Alpha CV PDFs.
 *
 * Run: npx tsx packages/ai/tests/test-pdf-extraction.ts
 */

import fs from "fs";
import path from "path";
import { extractPDFText } from "../src/pdf-extractor";

const ALPHA_CVS = path.resolve(__dirname, "../../../Alpha_CVs");

async function testPDF(filePath: string) {
  const name = path.basename(filePath);
  const buffer = fs.readFileSync(filePath);

  console.log(`\n${"=".repeat(60)}`);
  console.log(`FILE: ${name}`);
  console.log(`${"=".repeat(60)}`);

  // New extractor (pdf.js-extract)
  const result = await extractPDFText(buffer);

  console.log(`Pages: ${result.pageCount}`);
  console.log(`Columns detected: ${result.columnsDetected}`);
  console.log(`Multi-column: ${result.isMultiColumn}`);
  console.log(`Text length: ${result.text.length} chars`);
  console.log(`Word count: ${result.text.split(/\s+/).filter(w => w.length > 0).length}`);

  // Check for CV section keywords
  const sections = [
    "experience", "education", "skills", "work history", "employment",
    "qualifications", "certifications", "training", "professional",
    "objective", "summary", "profile", "projects", "awards",
  ];
  const textLower = result.text.toLowerCase();
  const found = sections.filter(s => textLower.includes(s));
  console.log(`Section keywords found: ${found.join(", ") || "NONE"}`);

  // Show first 500 chars
  console.log(`\n--- First 500 chars ---`);
  console.log(result.text.substring(0, 500));
  console.log(`--- End preview ---`);

  // Save full extraction for manual review
  const outDir = path.resolve(__dirname, "../../../Alpha_CVs/extracted");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, `${name.replace(".pdf", "")}_pdfjs.txt`);
  fs.writeFileSync(outPath, result.text, "utf-8");
  console.log(`Full text saved to: ${outPath}`);

  return result;
}

async function main() {
  // Find all PDFs in Alpha_CVs/1 and Alpha_CVs/2
  const folders = [
    path.join(ALPHA_CVS, "1"),
    path.join(ALPHA_CVS, "2"),
  ];

  const pdfs: string[] = [];
  for (const folder of folders) {
    if (!fs.existsSync(folder)) {
      console.warn(`Folder not found: ${folder}`);
      continue;
    }
    const files = fs.readdirSync(folder).filter(f => f.endsWith(".pdf"));
    pdfs.push(...files.map(f => path.join(folder, f)));
  }

  if (pdfs.length === 0) {
    console.error("No PDFs found in Alpha_CVs/1 or Alpha_CVs/2");
    process.exit(1);
  }

  console.log(`Found ${pdfs.length} PDFs to test\n`);

  const results: Array<{ name: string; pages: number; columns: number; multiCol: boolean; chars: number; words: number }> = [];

  for (const pdf of pdfs) {
    const r = await testPDF(pdf);
    results.push({
      name: path.basename(pdf),
      pages: r.pageCount,
      columns: r.columnsDetected,
      multiCol: r.isMultiColumn,
      chars: r.text.length,
      words: r.text.split(/\s+/).filter(w => w.length > 0).length,
    });
  }

  // Summary table
  console.log(`\n\n${"=".repeat(60)}`);
  console.log("SUMMARY");
  console.log(`${"=".repeat(60)}`);
  console.log(`${"Name".padEnd(40)} ${"Pg".padStart(3)} ${"Col".padStart(4)} ${"Multi".padStart(6)} ${"Chars".padStart(7)} ${"Words".padStart(7)}`);
  for (const r of results) {
    console.log(`${r.name.padEnd(40)} ${String(r.pages).padStart(3)} ${String(r.columns).padStart(4)} ${String(r.multiCol).padStart(6)} ${String(r.chars).padStart(7)} ${String(r.words).padStart(7)}`);
  }

  // Also test GitHub repo PDFs if available
  const folder3 = path.join(ALPHA_CVS, "3");
  if (fs.existsSync(folder3)) {
    const ghPdfs = findPDFs(folder3);
    if (ghPdfs.length > 0) {
      console.log(`\n\nGitHub Repo PDFs (${ghPdfs.length} files):`);
      for (const pdf of ghPdfs.slice(0, 5)) { // test first 5
        await testPDF(pdf);
      }
    }
  }
}

function findPDFs(dir: string): string[] {
  const results: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findPDFs(fullPath));
    } else if (entry.name.endsWith(".pdf")) {
      results.push(fullPath);
    }
  }
  return results;
}

main().catch(console.error);
