/**
 * Typed error categories for the AI pipeline.
 * Every error in the pipeline should use one of these types
 * so callers can handle failures predictably.
 */

export class PipelineError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly retryable: boolean,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "PipelineError";
  }
}

/** PDF/DOCX text extraction failed (pdf-parse or mammoth error) */
export class ExtractionError extends PipelineError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, "EXTRACTION_FAILED", false, details);
    this.name = "ExtractionError";
  }
}

/** Extracted text is too garbled, short, or missing key sections to be useful */
export class ExtractionQualityError extends PipelineError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, "EXTRACTION_QUALITY_LOW", false, details);
    this.name = "ExtractionQualityError";
  }
}

/** LLM returned output that doesn't match the expected schema */
export class SchemaValidationError extends PipelineError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, "SCHEMA_VALIDATION_FAILED", true, details);
    this.name = "SchemaValidationError";
  }
}

/** LLM API call timed out */
export class ModelTimeoutError extends PipelineError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, "MODEL_TIMEOUT", true, details);
    this.name = "ModelTimeoutError";
  }
}

/** LLM API rate limit or quota exceeded */
export class ModelRateLimitError extends PipelineError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, "MODEL_RATE_LIMIT", true, details);
    this.name = "ModelRateLimitError";
  }
}

/** LLM returned domain/category not in approved taxonomy (logged, not fatal) */
export class TaxonomyGapError extends PipelineError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, "TAXONOMY_GAP", false, details);
    this.name = "TaxonomyGapError";
  }
}

/** CV has no usable content (empty or too short after extraction) */
export class EmptyCVError extends PipelineError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, "EMPTY_CV", false, details);
    this.name = "EmptyCVError";
  }
}

/** File type not supported (not PDF or DOCX) */
export class UnsupportedFileError extends PipelineError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, "UNSUPPORTED_FILE_TYPE", false, details);
    this.name = "UnsupportedFileError";
  }
}

/** Generated output contains fabricated claims not supported by evidence */
export class GenerationSafetyError extends PipelineError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, "GENERATION_SAFETY", false, details);
    this.name = "GenerationSafetyError";
  }
}

/** No API key and no cached fixture available */
export class NoProviderError extends PipelineError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, "NO_PROVIDER", false, details);
    this.name = "NoProviderError";
  }
}
