/**
 * AI Provider — Abstraction over where the AI responses come from
 *
 * During development: "dev" mode reads from local JSON files.
 *   You generate these by pasting prompts into Claude Code (this extension).
 *
 * During production: "api" mode calls Anthropic API.
 *
 * The rest of the app doesn't care which one is active.
 *
 * NOTE: fs operations are lazily loaded so this module can be safely
 * imported in browser/edge environments. fs is only used in dev mode
 * which requires Node.js anyway.
 */

import type { ParsedJD, ParsedCV } from "./types";

export type ProviderMode = "dev" | "api";

let currentMode: ProviderMode = "dev";
let devDataDir: string = "./dev-data";

// Lazy-loaded fs functions — only resolved when dev mode actually runs
let _fs: typeof import("fs") | null = null;
let _path: typeof import("path") | null = null;

function getFs(): typeof import("fs") {
  if (!_fs) {
    try {
      // Dynamic require — bundlers can tree-shake this, and it won't
      // execute in browser/edge environments
      _fs = require("fs");
    } catch {
      throw new Error(
        "Dev mode requires Node.js (fs module not available). " +
        "Set provider to 'api' mode in non-Node environments."
      );
    }
  }
  return _fs!;
}

function getPath(): typeof import("path") {
  if (!_path) {
    try {
      _path = require("path");
    } catch {
      throw new Error("Dev mode requires Node.js (path module not available).");
    }
  }
  return _path!;
}

export function setProvider(mode: ProviderMode, dataDir?: string) {
  currentMode = mode;
  if (dataDir) devDataDir = dataDir;
}

export function getProviderMode(): ProviderMode {
  return currentMode;
}

// ============================================================
// DEV MODE — File-based responses
// ============================================================

/**
 * In dev mode, AI calls become file reads.
 *
 * Workflow:
 * 1. App calls parseJD("some job description text")
 * 2. In dev mode, it writes the prompt to dev-data/prompts/jd-parse-{hash}.txt
 * 3. You open that file, paste it into Claude, get the JSON response
 * 4. You save the response to dev-data/responses/jd-parse-{hash}.json
 * 5. Next time the app runs, it reads the cached response
 *
 * OR (simpler): You manually create the JSON files once, they're reused.
 */

function ensureDir(dir: string) {
  const fs = getFs();
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function hashString(s: string): string {
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    const char = s.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

export function saveDevPrompt(type: string, input: string, prompt: string): string {
  const path = getPath();
  const dir = path.join(devDataDir, "prompts");
  ensureDir(dir);
  const id = `${type}-${hashString(input)}`;
  const filePath = path.join(dir, `${id}.txt`);
  getFs().writeFileSync(filePath, prompt, "utf-8");
  return id;
}

export function getDevResponse<T>(type: string, input: string): T | null {
  const fs = getFs();
  const path = getPath();
  const id = `${type}-${hashString(input)}`;
  const filePath = path.join(devDataDir, "responses", `${id}.json`);
  if (fs.existsSync(filePath)) {
    return JSON.parse(fs.readFileSync(filePath, "utf-8")) as T;
  }
  return null;
}

export function saveDevResponse(type: string, input: string, response: unknown): void {
  const path = getPath();
  const dir = path.join(devDataDir, "responses");
  ensureDir(dir);
  const id = `${type}-${hashString(input)}`;
  const filePath = path.join(dir, `${id}.json`);
  getFs().writeFileSync(filePath, JSON.stringify(response, null, 2), "utf-8");
}

// ============================================================
// CONVENIENCE: Save your own parsed data directly
// ============================================================

/**
 * Save a parsed JD directly (you generate it using Claude Code).
 * Used during dev to bypass API calls entirely.
 */
export function saveDevParsedJD(jdText: string, parsed: ParsedJD): void {
  saveDevResponse("jd-parse", jdText, parsed);
}

/**
 * Save a parsed CV directly (you generate it using Claude Code).
 */
export function saveDevParsedCV(cvText: string, parsed: ParsedCV): void {
  saveDevResponse("cv-parse", cvText, parsed);
}

/**
 * Load a previously saved parsed JD.
 */
export function loadDevParsedJD(jdText: string): ParsedJD | null {
  return getDevResponse<ParsedJD>("jd-parse", jdText);
}

/**
 * Load a previously saved parsed CV.
 */
export function loadDevParsedCV(cvText: string): ParsedCV | null {
  return getDevResponse<ParsedCV>("cv-parse", cvText);
}
