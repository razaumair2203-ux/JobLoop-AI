"use client";

import { useState, useRef } from "react";
import { Upload, FileText, FileArchive, X, Plus, Loader2, ExternalLink } from "lucide-react";
import type { UploadResult } from "../page";

const CV_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
const ZIP_TYPES = ["application/zip", "application/x-zip-compressed"];
const MAX_FILES = 5;
const MAX_SIZE = 10 * 1024 * 1024;
const MAX_ZIP_SIZE = 50 * 1024 * 1024;

export interface SocraticQuestion {
  id: string;
  question: string;
  skill_name: string;
  why_asking: string;
}

interface StepUploadProps {
  onNext: (results: UploadResult[], questions: SocraticQuestion[]) => void;
  onSkip: () => void;
}

export function StepUpload({ onNext, onSkip }: StepUploadProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function addFiles(incoming: FileList | File[]) {
    const valid: File[] = [];
    for (const f of Array.from(incoming)) {
      if (files.some((existing) => existing.name === f.name)) continue;

      const isZip = ZIP_TYPES.includes(f.type) || f.name.toLowerCase().endsWith(".zip");
      const isCV = CV_TYPES.includes(f.type);

      if (!isZip && !isCV) continue;
      if (isZip && f.size > MAX_ZIP_SIZE) continue;
      if (isCV && f.size > MAX_SIZE) continue;

      valid.push(f);
    }
    setFiles((prev) => [...prev, ...valid].slice(0, MAX_FILES));
  }

  function removeFile(name: string) {
    setFiles((prev) => prev.filter((f) => f.name !== name));
  }

  async function handleUpload() {
    if (files.length === 0) return;
    setUploading(true);
    setError(null);

    try {
      const allResults = [];
      let capturedQuestions: SocraticQuestion[] = [];

      // Split files into CVs and LinkedIn ZIPs
      const cvFiles = files.filter((f) => !isZipFile(f));
      const zipFiles = files.filter((f) => isZipFile(f));

      // Upload regular CVs
      if (cvFiles.length > 0) {
        const formData = new FormData();
        for (const file of cvFiles) {
          formData.append("files", file);
        }

        const res = await fetch("/api/cv/upload", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "CV upload failed");
        }

        const data = await res.json();
        allResults.push(...data.results);
        // Capture socratic questions from upload response
        if (data.socratic_questions?.length) {
          capturedQuestions = data.socratic_questions;
        }
      }

      // Upload LinkedIn ZIPs (one at a time)
      for (const zipFile of zipFiles) {
        const formData = new FormData();
        formData.append("file", zipFile);

        const res = await fetch("/api/cv/linkedin-import", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "LinkedIn import failed");
        }

        const data = await res.json();
        allResults.push({
          id: data.id,
          filename: zipFile.name,
          status: "parsed",
          source: "linkedin_export",
          skills_found: data.stats.skills_found,
          experience_count: data.stats.experience_count,
          warnings: data.warnings,
        });
      }

      onNext(allResults, capturedQuestions);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      setUploading(false);
    }
  }

  function isZipFile(f: File): boolean {
    return ZIP_TYPES.includes(f.type) || f.name.toLowerCase().endsWith(".zip");
  }

  return (
    <div>
      <h2 className="text-xl font-semibold text-zinc-900">Upload your CVs</h2>
      <p className="mt-1 text-sm text-zinc-500">
        Upload one or more CVs &mdash; we&apos;ll extract skills, experience,
        and achievements from all of them to build a richer Profile Cloud. PDF or
        DOCX, up to {MAX_FILES} files.
      </p>

      {/* LinkedIn fast-path */}
      <div className="mt-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white font-bold text-sm">
            in
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-blue-900">Import from LinkedIn</h3>
            <p className="mt-0.5 text-xs text-blue-700">
              Fast-path: export your LinkedIn profile data and upload the ZIP file. We&apos;ll extract your full work history, skills, and endorsements automatically.
            </p>
            <div className="mt-2 flex items-center gap-3">
              <button
                onClick={() => {
                  window.open("https://www.linkedin.com/mypreferences/d/download-my-data", "_blank", "noopener");
                }}
                className="flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
              >
                <ExternalLink className="h-3 w-3" />
                Get LinkedIn Export
              </button>
              <span className="text-[10px] text-blue-500">
                Settings &rarr; Data Privacy &rarr; Get a copy of your data
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="relative my-5 flex items-center">
        <div className="flex-1 border-t border-zinc-200" />
        <span className="px-3 text-xs font-medium text-zinc-400">or upload CVs directly</span>
        <div className="flex-1 border-t border-zinc-200" />
      </div>

      {/* Drop zone */}
      <div
        className={`mt-6 flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors ${
          dragging
            ? "border-brand-500 bg-brand-50"
            : "border-zinc-300 hover:border-brand-400"
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          addFiles(e.dataTransfer.files);
        }}
      >
        <Upload className="h-10 w-10 text-zinc-400" />
        <p className="mt-3 text-sm text-zinc-600">
          Drag and drop your CVs here, or{" "}
          <button
            onClick={() => inputRef.current?.click()}
            className="font-medium text-brand-600 hover:text-brand-700"
          >
            browse
          </button>
        </p>
        <p className="mt-1 text-xs text-zinc-400">
          PDF, DOCX, or LinkedIn ZIP export
        </p>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.docx,.zip"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) addFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="mt-4 space-y-2">
          {files.map((f) => (
            <div
              key={f.name}
              className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-2.5"
            >
              {isZipFile(f) ? (
                <FileArchive className="h-5 w-5 shrink-0 text-blue-500" />
              ) : (
                <FileText className="h-5 w-5 shrink-0 text-brand-500" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-zinc-900">
                  {f.name}
                </p>
                <p className="text-xs text-zinc-500">
                  {(f.size / 1024).toFixed(0)} KB
                </p>
              </div>
              {!uploading && (
                <button
                  onClick={() => removeFile(f.name)}
                  className="shrink-0 rounded-full p-1 text-zinc-400 hover:bg-zinc-200 hover:text-zinc-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}

          {files.length < MAX_FILES && !uploading && (
            <button
              onClick={() => inputRef.current?.click()}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-zinc-300 py-2 text-sm text-zinc-500 transition-colors hover:border-brand-400 hover:text-brand-600"
            >
              <Plus className="h-4 w-4" />
              Add another CV
            </button>
          )}
        </div>
      )}

      {error && (
        <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
          {error}
        </p>
      )}

      {/* Actions */}
      <div className="mt-6 flex gap-3">
        <button
          onClick={onSkip}
          disabled={uploading}
          className="h-10 flex-1 rounded-lg border border-zinc-200 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-50 disabled:opacity-40"
        >
          Skip for now
        </button>
        <button
          onClick={handleUpload}
          disabled={files.length === 0 || uploading}
          className="flex h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-brand-600 text-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {uploading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Building your Profile Cloud...
            </>
          ) : files.length > 0 ? (
            `Upload ${files.length} CV${files.length > 1 ? "s" : ""} & continue`
          ) : (
            "Upload & continue"
          )}
        </button>
      </div>
    </div>
  );
}
