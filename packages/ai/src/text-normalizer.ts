/**
 * Pre-LLM text normalization for extracted CV text.
 * Runs BEFORE sending to LLM — saves tokens, improves parse accuracy.
 * Informed by analysis of 20,690 real resumes (opensporks + resume-atlas + master_resumes).
 */

/**
 * Collapse character-spaced text: "S e n i o r" → "Senior"
 * Common artifact from PDFs with tracked kerning or decorative headers.
 */
function collapseCharacterSpacing(text: string): string {
  // Match sequences where single chars are separated by single spaces
  // At least 3 chars (to avoid false positives like "I am")
  return text.replace(/\b([A-Za-z]) (?=[A-Za-z] [A-Za-z]|[A-Za-z]\b)/g, (_, char) => {
    return char;
  }).replace(/([A-Za-z]) ([A-Za-z])\b/g, (match, a, b) => {
    // Only collapse if preceded by a collapsed char (part of a sequence)
    return match;
  });
}

// More robust: detect lines that are mostly single-char-spaced
function collapseCharacterSpacedLines(text: string): string {
  return text.replace(/^(.+)$/gm, (line) => {
    // Count single-char tokens separated by spaces
    const tokens = line.split(" ");
    const singleCharTokens = tokens.filter((t) => t.length === 1 && /[A-Za-z]/.test(t));
    // If >60% of tokens are single chars and line has 5+ tokens, it's character-spaced
    if (tokens.length >= 5 && singleCharTokens.length / tokens.length > 0.6) {
      return tokens.join("");
    }
    return line;
  });
}

/**
 * Remove repeated headers/footers (name, email, phone appearing on every page).
 * PDF extraction often repeats these per page.
 */
function removeRepeatedHeaders(text: string): string {
  const lines = text.split("\n");
  if (lines.length < 20) return text; // Too short to have repeated headers

  // Find lines that appear 3+ times (likely header/footer)
  const lineCounts = new Map<string, number>();
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length > 3 && trimmed.length < 80) {
      lineCounts.set(trimmed, (lineCounts.get(trimmed) || 0) + 1);
    }
  }

  const repeatedLines = new Set<string>();
  for (const [line, count] of lineCounts) {
    if (count >= 3) {
      repeatedLines.add(line);
    }
  }

  if (repeatedLines.size === 0) return text;

  // Remove all but the first occurrence of repeated lines
  const seen = new Set<string>();
  return lines
    .filter((line) => {
      const trimmed = line.trim();
      if (repeatedLines.has(trimmed)) {
        if (seen.has(trimmed)) return false;
        seen.add(trimmed);
      }
      return true;
    })
    .join("\n");
}

/**
 * Fix encoding artifacts common in PDF extraction.
 * Ligatures, smart quotes, em-dashes, bullet chars.
 */
function fixEncoding(text: string): string {
  return text
    // Ligatures
    .replace(/ﬁ/g, "fi")
    .replace(/ﬂ/g, "fl")
    .replace(/ﬀ/g, "ff")
    .replace(/ﬃ/g, "ffi")
    .replace(/ﬄ/g, "ffl")
    // Smart quotes → standard
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    // Dashes
    .replace(/\u2013/g, "-") // en-dash
    .replace(/\u2014/g, " - ") // em-dash
    // Bullets and symbols
    .replace(/[\u2022\u2023\u25E6\u2043\u2219]/g, "- ") // bullet variants → dash
    .replace(/\u00B7/g, "- ") // middle dot as bullet
    // Non-breaking space
    .replace(/\u00A0/g, " ")
    // Zero-width chars
    .replace(/[\u200B\u200C\u200D\uFEFF]/g, "");
}

/**
 * Consolidate excessive whitespace without destroying structure.
 * Preserves single blank lines (section separators) but removes 3+ consecutive blanks.
 */
function consolidateWhitespace(text: string): string {
  return text
    // Multiple spaces → single (but not at line start — preserve indentation)
    .replace(/([^\n]) {2,}/g, "$1 ")
    // 3+ blank lines → 2 (preserve section breaks)
    .replace(/\n{4,}/g, "\n\n\n")
    // Trailing whitespace per line
    .replace(/[ \t]+$/gm, "");
}

/**
 * Remove page numbers and common page-break artifacts.
 */
function removePageArtifacts(text: string): string {
  return text
    // Standalone page numbers (line that's just a number)
    .replace(/^\s*\d{1,3}\s*$/gm, "")
    // "Page X of Y" patterns
    .replace(/^\s*Page\s+\d+\s*(of\s+\d+)?\s*$/gim, "")
    // Form feed characters
    .replace(/\f/g, "\n");
}

/**
 * Detect and attempt to fix two-column layout artifacts.
 * When PDF has two columns, extraction often interleaves them line-by-line.
 * Heuristic: if many short lines (<40 chars) alternate with content, flag it.
 */
function detectColumnArtifacts(text: string): { text: string; hasColumnIssues: boolean } {
  const lines = text.split("\n");
  const shortLines = lines.filter((l) => l.trim().length > 0 && l.trim().length < 35);
  const ratio = shortLines.length / lines.filter((l) => l.trim().length > 0).length;

  // If >70% of non-empty lines are very short, likely column artifact
  // We can't reliably fix this, but we flag it for the LLM
  if (ratio > 0.7 && lines.length > 30) {
    return { text, hasColumnIssues: true };
  }
  return { text, hasColumnIssues: false };
}

// ============================================================
// Extraction Quality Assessment
// ============================================================

/** Section keywords that indicate a real CV (case-insensitive) */
const SECTION_KEYWORDS = [
  "experience", "education", "skills", "work history", "employment",
  "qualifications", "certifications", "training", "professional",
  "objective", "summary", "profile", "projects", "awards",
  "volunteer", "references", "achievements", "competencies",
];

export interface ExtractionQuality {
  /** Overall quality: "good" | "poor" | "failed" */
  quality: "good" | "poor" | "failed";
  /** Character count of extracted text */
  charCount: number;
  /** Number of CV section keywords found */
  sectionsDetected: number;
  /** Ratio of non-ASCII/garbled characters */
  garbledRatio: number;
  /** Whether text appears to be from a scanned/image PDF */
  likelyScanned: boolean;
  /** Human-readable issues */
  issues: string[];
}

/**
 * Assess the quality of extracted text BEFORE sending to LLM.
 * Call after pdf-parse/mammoth, before normalizeExtractedText().
 * If quality is "failed", do NOT send to LLM — it will waste tokens on garbage.
 */
export function assessExtractionQuality(text: string): ExtractionQuality {
  const issues: string[] = [];
  const charCount = text.length;

  // Check 1: Too short
  if (charCount < 100) {
    return {
      quality: "failed",
      charCount,
      sectionsDetected: 0,
      garbledRatio: 0,
      likelyScanned: charCount < 20,
      issues: ["Text too short — likely empty or image-only PDF"],
    };
  }

  // Check 2: Section keywords
  const textLower = text.toLowerCase();
  const sectionsDetected = SECTION_KEYWORDS.filter((kw) => textLower.includes(kw)).length;
  if (sectionsDetected === 0) {
    issues.push("No CV section keywords found (experience, education, skills, etc.)");
  }

  // Check 3: Garbled character ratio (non-printable, non-standard chars)
  const garbledChars = text.replace(/[\x20-\x7E\n\r\t\u00A0-\u024F\u0600-\u06FF]/g, "");
  const garbledRatio = garbledChars.length / charCount;
  if (garbledRatio > 0.15) {
    issues.push(`High garbled character ratio: ${(garbledRatio * 100).toFixed(1)}%`);
  }

  // Check 4: Likely scanned (very few words relative to length, or mostly numbers)
  const wordCount = text.split(/\s+/).filter((w) => w.length > 1).length;
  const likelyScanned = wordCount < 20 && charCount > 200;
  if (likelyScanned) {
    issues.push("Very few words detected — likely scanned/image PDF");
  }

  // Check 5: Word density (real CVs have reasonable word density)
  const avgWordLength = charCount / Math.max(wordCount, 1);
  if (avgWordLength > 20 && charCount > 200) {
    issues.push("Low word density — text may be garbled or encoded incorrectly");
  }

  // Determine quality
  let quality: "good" | "poor" | "failed";
  if (likelyScanned || garbledRatio > 0.3 || charCount < 100) {
    quality = "failed";
  } else if (sectionsDetected === 0 || garbledRatio > 0.15 || issues.length >= 2) {
    quality = "poor";
  } else {
    quality = "good";
  }

  return { quality, charCount, sectionsDetected, garbledRatio, likelyScanned, issues };
}

// ============================================================
// Normalization Pipeline
// ============================================================

export interface NormalizedText {
  text: string;
  originalLength: number;
  normalizedLength: number;
  tokensSaved: number; // approximate (chars / 4)
  warnings: string[];
}

/**
 * Main normalization pipeline. Call this between pdf-parse output and LLM call.
 */
export function normalizeExtractedText(rawText: string): NormalizedText {
  const originalLength = rawText.length;
  const warnings: string[] = [];

  let text = rawText;

  // Step 1: Fix encoding first (affects all other steps)
  text = fixEncoding(text);

  // Step 2: Remove page artifacts
  text = removePageArtifacts(text);

  // Step 3: Collapse character-spaced text
  text = collapseCharacterSpacedLines(text);

  // Step 4: Remove repeated headers/footers
  text = removeRepeatedHeaders(text);

  // Step 5: Consolidate whitespace
  text = consolidateWhitespace(text);

  // Step 6: Detect column issues (flag only, don't modify)
  const columnCheck = detectColumnArtifacts(text);
  text = columnCheck.text;
  if (columnCheck.hasColumnIssues) {
    warnings.push("MULTI_COLUMN_DETECTED: Text may have interleaved column artifacts");
  }

  // Final trim
  text = text.trim();

  const normalizedLength = text.length;
  const tokensSaved = Math.round((originalLength - normalizedLength) / 4);

  return {
    text,
    originalLength,
    normalizedLength,
    tokensSaved,
    warnings,
  };
}
