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

interface ExistingCV {
  id: string;
  filename: string;
  created_at: string;
}

export function StepUpload({ onNext, onSkip }: StepUploadProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [atLimit, setAtLimit] = useState<{ existing_cvs: ExistingCV[]; need_to_free: number } | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
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

  async function deleteExistingCV(cvId: string) {
    setDeleting(cvId);
    try {
      const res = await fetch(`/api/cv/${cvId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");

      setAtLimit((prev) => {
        if (!prev) return null;
        const updated = prev.existing_cvs.filter((c) => c.id !== cvId);
        const newNeed = prev.need_to_free - 1;
        if (newNeed <= 0) return null; // enough room, clear the picker
        return { existing_cvs: updated, need_to_free: newNeed };
      });
      setError(null);
    } catch {
      setError("Failed to delete CV. Try again.");
    } finally {
      setDeleting(null);
    }
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

        const data = await res.json();

        if (!res.ok) {
          if (data.error === "at_limit") {
            setAtLimit({ existing_cvs: data.existing_cvs, need_to_free: data.need_to_free });
            setUploading(false);
            return;
          }
          throw new Error(data.message || data.error || "CV upload failed");
        }

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
      <h2 className="text-xl font-semibold text-surface-text">Upload your CVs</h2>
      <p className="mt-1 text-sm text-surface-text-muted">
        Upload one or more CVs &mdash; we&apos;ll extract skills, experience,
        and achievements from all of them to build a richer Profile Cloud. PDF or
        DOCX, up to {MAX_FILES} files.
      </p>

      {/* At-limit picker: user must delete existing CVs before uploading more */}
      {atLimit && (
        <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-4">
          <h3 className="text-sm font-semibold text-amber-900">
            CV limit reached ({MAX_FILES} max)
          </h3>
          <p className="mt-1 text-xs text-amber-700">
            Delete {atLimit.need_to_free} CV{atLimit.need_to_free > 1 ? "s" : ""} to make room for your new upload{files.length > 1 ? "s" : ""}.
          </p>
          <div className="mt-3 space-y-2">
            {atLimit.existing_cvs.map((cv) => (
              <div
                key={cv.id}
                className="flex items-center justify-between rounded-md border border-amber-200 bg-surface-0 px-3 py-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-surface-text">
                    {cv.filename}
                  </p>
                  <p className="text-xs text-surface-text-muted">
                    Uploaded {new Date(cv.created_at).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={() => deleteExistingCV(cv.id)}
                  disabled={deleting === cv.id}
                  className="ml-3 shrink-0 rounded-md border border-red-200 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-40"
                >
                  {deleting === cv.id ? "Deleting..." : "Delete"}
                </button>
              </div>
            ))}
          </div>
          {atLimit.need_to_free <= 0 && (
            <button
              onClick={handleUpload}
              className="mt-3 w-full rounded-lg bg-brand-600 py-2 text-sm font-medium text-white hover:bg-brand-700"
            >
              Continue upload
            </button>
          )}
        </div>
      )}

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
        <div className="flex-1 border-t border-surface-border" />
        <span className="px-3 text-xs font-medium text-surface-text-muted">or upload CVs directly</span>
        <div className="flex-1 border-t border-surface-border" />
      </div>

      {/* Drop zone */}
      <div
        className={`mt-6 flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors ${
          dragging
            ? "border-brand-500 bg-brand-50"
            : "border-surface-border hover:border-brand-400"
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
        <Upload className="h-10 w-10 text-surface-text-muted" />
        <p className="mt-3 text-sm text-surface-text-secondary">
          Drag and drop your CVs here, or{" "}
          <button
            onClick={() => inputRef.current?.click()}
            className="font-medium text-brand-600 hover:text-brand-700"
          >
            browse
          </button>
        </p>
        <p className="mt-1 text-xs text-surface-text-muted">
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
              className="flex items-center gap-3 rounded-lg border border-surface-border bg-surface-2 px-4 py-2.5"
            >
              {isZipFile(f) ? (
                <FileArchive className="h-5 w-5 shrink-0 text-blue-500" />
              ) : (
                <FileText className="h-5 w-5 shrink-0 text-brand-500" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-surface-text">
                  {f.name}
                </p>
                <p className="text-xs text-surface-text-muted">
                  {(f.size / 1024).toFixed(0)} KB
                </p>
              </div>
              {!uploading && (
                <button
                  onClick={() => removeFile(f.name)}
                  className="shrink-0 rounded-full p-1 text-surface-text-muted hover:bg-surface-3 hover:text-surface-text-secondary"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}

          {files.length < MAX_FILES && !uploading && (
            <button
              onClick={() => inputRef.current?.click()}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-surface-border py-2 text-sm text-surface-text-muted transition-colors hover:border-brand-400 hover:text-brand-600"
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
          className="h-10 flex-1 rounded-lg border border-surface-border text-sm font-medium text-surface-text-secondary transition-colors hover:bg-surface-2 disabled:opacity-40"
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
              Reading your career story...
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
