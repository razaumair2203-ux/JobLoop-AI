/**
 * Certificate PDF Extractor
 *
 * Extracts structured certification data from PDF text content.
 * Handles Coursera certificates, PMI credentials, and generic cert formats.
 *
 * Deterministic — zero LLM calls, zero tokens.
 * Works on already-extracted PDF text (from pdf-parse or similar).
 */

// ============================================================
// TYPES
// ============================================================

export interface ExtractedCertificate {
  /** Certificate/course name */
  name: string;
  /** Issuing organization */
  issuer: string;
  /** Platform (if online), e.g. "Coursera", "edX", "Udemy" */
  platform: string | null;
  /** Date of completion */
  date: string | null;
  /** Certificate type */
  type: "specialization" | "professional_certificate" | "course" | "certification" | "unknown";
  /** Number of courses (for specializations/professional certs) */
  course_count: number | null;
  /** Individual course names (for specializations) */
  courses: string[];
  /** Credential/verification ID */
  credential_id: string | null;
  /** Verification URL */
  verification_url: string | null;
  /** Name on certificate */
  recipient_name: string | null;
  /** Confidence of extraction (0-1) */
  confidence: number;
}

// ============================================================
// DATE EXTRACTION
// ============================================================

const MONTH_NAMES = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december",
];
const MONTH_ABBREVS = [
  "jan", "feb", "mar", "apr", "may", "jun",
  "jul", "aug", "sep", "oct", "nov", "dec",
];

function extractDate(text: string): string | null {
  // "Feb 26, 2024" or "February 26, 2024"
  const fullDate = text.match(
    /\b((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*)\s+(\d{1,2}),?\s+(\d{4})\b/i
  );
  if (fullDate) {
    return `${fullDate[1]} ${fullDate[2]}, ${fullDate[3]}`;
  }

  // "Mar 2024"
  const monthYear = text.match(
    /\b((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*)\s+(\d{4})\b/i
  );
  if (monthYear) {
    return `${monthYear[1]} ${monthYear[2]}`;
  }

  // "2024-03-01" ISO
  const iso = text.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (iso) {
    const monthIdx = parseInt(iso[2]) - 1;
    if (monthIdx >= 0 && monthIdx < 12) {
      return `${MONTH_ABBREVS[monthIdx]} ${iso[3]}, ${iso[1]}`;
    }
  }

  return null;
}

// ============================================================
// RECIPIENT NAME EXTRACTION
// ============================================================

function extractRecipientName(text: string): string | null {
  // Look for "NAME\nhas successfully completed" pattern
  const completedPattern = text.match(
    /\n([A-Z][A-Z\s.]+)\n\s*has\s+successfully\s+completed/
  );
  if (completedPattern) {
    return completedPattern[1].trim();
  }

  // "Awarded to NAME" or "This certifies that NAME"
  const awardPattern = text.match(
    /(?:awarded\s+to|certifies\s+that|granted\s+to|issued\s+to)\s+([A-Z][A-Za-z\s.]+?)(?:\n|,|has)/i
  );
  if (awardPattern) {
    return awardPattern[1].trim();
  }

  return null;
}

// ============================================================
// COURSERA EXTRACTOR
// ============================================================

function extractCourseraCert(text: string): ExtractedCertificate | null {
  // Check if this is a Coursera certificate
  if (!text.toLowerCase().includes("coursera")) return null;

  const cert: ExtractedCertificate = {
    name: "",
    issuer: "",
    platform: "Coursera",
    date: null,
    type: "unknown",
    course_count: null,
    courses: [],
    credential_id: null,
    verification_url: null,
    recipient_name: null,
    confidence: 0.5,
  };

  // Extract date
  cert.date = extractDate(text);

  // Extract recipient name
  cert.recipient_name = extractRecipientName(text);

  // Determine type: Professional Certificate, Specialization, or Course
  const lowerText = text.toLowerCase();
  if (lowerText.includes("professional certificate")) {
    cert.type = "professional_certificate";
    cert.confidence = 0.9;
  } else if (lowerText.includes("specialization")) {
    cert.type = "specialization";
    cert.confidence = 0.9;
  } else if (lowerText.includes("course certificate") || lowerText.includes("has successfully completed")) {
    cert.type = "course";
    cert.confidence = 0.85;
  }

  // Extract course count ("6 Courses", "3 Courses")
  const courseCount = text.match(/(\d+)\s+Courses?\b/i);
  if (courseCount) {
    cert.course_count = parseInt(courseCount[1]);
  }

  // Extract certificate name
  // For professional certs: "the online Professional Certificate\n\nNAME"
  const profCertName = text.match(
    /(?:Professional\s+Certificate|Specialization)\s*\n\s*\n?\s*(.+?)(?:\n\s*\n|Those\s+who|This\s+Specialization|In\s+this)/s
  );
  if (profCertName) {
    cert.name = profCertName[1].replace(/\n/g, " ").trim();
  }

  // For individual courses: "has successfully completed\n\nNAME"
  if (!cert.name) {
    const courseName = text.match(
      /has\s+successfully\s+completed\s*\n\s*\n?\s*(.+?)(?:\n\s*\n|an\s+online\s+course)/s
    );
    if (courseName) {
      cert.name = courseName[1].replace(/\n/g, " ").trim();
    }
  }

  // Extract issuer: "authorized by UNIVERSITY" or university name before instructor
  const authorizedBy = text.match(/authorized\s+by\s+(.+?)\s+and\s+offered/i);
  if (authorizedBy) {
    cert.issuer = authorizedBy[1].trim();
  }

  // For professional certs, look for the company logo text (e.g., "Google")
  if (!cert.issuer) {
    // Try to find issuer from common patterns
    const issuers = [
      "Google", "IBM", "Meta", "Microsoft", "Amazon", "Coursera",
      "Rice University", "University of Colorado Boulder",
      "University of Michigan", "University of Illinois",
      "Kennesaw State University", "Stanford", "Duke",
      "University of Pennsylvania", "Johns Hopkins",
    ];
    for (const issuer of issuers) {
      if (text.includes(issuer)) {
        cert.issuer = issuer;
        break;
      }
    }
  }

  // Extract individual course names from specialization listings
  const courseList = text.match(/(?:Courses?\s*\n)([\s\S]+?)(?:\n\s*\n[A-Z]|\n\s*(?:Tom|Bill|Charles|Amanda|Elizabeth|William))/);
  if (courseList) {
    cert.courses = courseList[1]
      .split("\n")
      .map(s => s.trim())
      .filter(s => s.length > 5 && !s.match(/^\d+\s+Courses?$/i));
  }

  // Extract verification URL
  const verifyUrl = text.match(
    /(?:verify\s+(?:this\s+certificate\s+)?at|verify\s+at)[:\s]*\n?\s*(https?:\/\/[^\s\n]+)/i
  );
  if (verifyUrl) {
    cert.verification_url = verifyUrl[1].trim();
  }

  // Extract credential ID from verification URL
  if (cert.verification_url) {
    const credMatch = cert.verification_url.match(/\/([A-Z0-9]+)\s*$/);
    if (credMatch) {
      cert.credential_id = credMatch[1];
    }
  }

  // Bump confidence if we got the key fields
  if (cert.name && cert.issuer) cert.confidence = 0.95;

  return cert.name ? cert : null;
}

// ============================================================
// GENERIC CERTIFICATE EXTRACTOR
// ============================================================

function extractGenericCert(text: string): ExtractedCertificate | null {
  // Look for common certification patterns
  const cert: ExtractedCertificate = {
    name: "",
    issuer: "",
    platform: null,
    date: null,
    type: "certification",
    course_count: null,
    courses: [],
    credential_id: null,
    verification_url: null,
    recipient_name: null,
    confidence: 0.3,
  };

  cert.date = extractDate(text);
  cert.recipient_name = extractRecipientName(text);

  // Try to extract cert name from common patterns
  const certPatterns = [
    /certif(?:y|ies|icate)\s+that\s+.+?\s+has\s+(?:earned|completed|achieved)\s+(?:the\s+)?(.+?)(?:\n|certification)/i,
    /has\s+earned\s+the\s+designation\s+of\s+(.+?)(?:\n|from)/i,
    /is\s+hereby\s+certified\s+as\s+(?:a\s+)?(.+?)(?:\n|by)/i,
  ];

  for (const pattern of certPatterns) {
    const match = text.match(pattern);
    if (match) {
      cert.name = match[1].trim();
      break;
    }
  }

  // Known certification bodies
  const certBodies: Record<string, string> = {
    "project management institute": "PMI",
    "pmi": "PMI",
    "isaca": "ISACA",
    "isc2": "(ISC)2",
    "comptia": "CompTIA",
    "aws": "Amazon Web Services",
    "cisco": "Cisco",
    "scrum alliance": "Scrum Alliance",
    "scaled agile": "Scaled Agile",
  };

  const lowerText = text.toLowerCase();
  for (const [key, value] of Object.entries(certBodies)) {
    if (lowerText.includes(key)) {
      cert.issuer = value;
      cert.confidence = 0.7;
      break;
    }
  }

  // Known cert names
  const knownCerts: Array<{ pattern: RegExp; name: string; issuer: string }> = [
    { pattern: /PMP|Project Management Professional/i, name: "Project Management Professional (PMP)", issuer: "PMI" },
    { pattern: /PMI-ACP|Agile Certified Practitioner/i, name: "PMI Agile Certified Practitioner (PMI-ACP)", issuer: "PMI" },
    { pattern: /CAPM/i, name: "Certified Associate in Project Management (CAPM)", issuer: "PMI" },
    { pattern: /CSEP|Certified Systems Engineering Professional/i, name: "Certified Systems Engineering Professional (CSEP)", issuer: "INCOSE" },
    { pattern: /Professional Engineer|P\.?E\.?\b/i, name: "Professional Engineer (PE)", issuer: "" },
    { pattern: /CSM|Certified ScrumMaster/i, name: "Certified ScrumMaster (CSM)", issuer: "Scrum Alliance" },
    { pattern: /SAFe\s+Agilist/i, name: "SAFe Agilist", issuer: "Scaled Agile" },
    { pattern: /PRINCE2/i, name: "PRINCE2", issuer: "Axelos" },
    { pattern: /Six Sigma.+?Black Belt/i, name: "Six Sigma Black Belt", issuer: "" },
    { pattern: /Six Sigma.+?Green Belt/i, name: "Six Sigma Green Belt", issuer: "" },
  ];

  for (const known of knownCerts) {
    if (known.pattern.test(text)) {
      cert.name = known.name;
      if (known.issuer) cert.issuer = known.issuer;
      cert.confidence = 0.9;
      break;
    }
  }

  // Extract credential ID
  const credId = text.match(/(?:credential|certificate|badge)\s*(?:id|#|no\.?)[:\s]*([A-Z0-9\-]+)/i);
  if (credId) {
    cert.credential_id = credId[1];
  }

  // Extract verification URL
  const url = text.match(/(https?:\/\/[^\s\n]+(?:verify|credential|badge)[^\s\n]*)/i);
  if (url) {
    cert.verification_url = url[1];
  }

  return cert.name ? cert : null;
}

// ============================================================
// PUBLIC API
// ============================================================

/**
 * Extract certificate information from PDF text content.
 *
 * @param text - Raw text extracted from a certificate PDF
 * @returns ExtractedCertificate or null if no certificate pattern detected
 *
 * Cost: $0 — pure regex/string matching, no LLM calls.
 */
export function extractCertificate(text: string): ExtractedCertificate | null {
  // Try Coursera first (most structured)
  const coursera = extractCourseraCert(text);
  if (coursera) return coursera;

  // Try generic patterns
  const generic = extractGenericCert(text);
  if (generic) return generic;

  return null;
}

/**
 * Batch extract certificates from multiple PDF texts.
 * Deduplicates by name + issuer.
 */
export function extractCertificates(
  documents: Array<{ id: string; name: string; text: string }>,
): Array<ExtractedCertificate & { source_id: string; source_name: string }> {
  const results: Array<ExtractedCertificate & { source_id: string; source_name: string }> = [];
  const seen = new Set<string>();

  for (const doc of documents) {
    const cert = extractCertificate(doc.text);
    if (!cert) continue;

    const key = `${cert.name.toLowerCase()}|${cert.issuer.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);

    results.push({ ...cert, source_id: doc.id, source_name: doc.name });
  }

  return results;
}

/**
 * Quick check: does this PDF text look like a certificate (vs a CV or other document)?
 */
export function isCertificatePDF(text: string): boolean {
  const lowerText = text.toLowerCase();
  const certIndicators = [
    "has successfully completed",
    "certificate of completion",
    "course certificate",
    "professional certificate",
    "specialization",
    "is hereby certified",
    "credential id",
    "verify this certificate",
    "verify at",
  ];

  const matchCount = certIndicators.filter(indicator => lowerText.includes(indicator)).length;
  return matchCount >= 2;
}
