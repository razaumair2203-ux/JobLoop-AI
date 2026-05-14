// Plan limits
export const PLAN_LIMITS = {
  free: {
    analyses_per_month: 3,
    cv_generations_per_month: 3,
    cover_letters_per_month: 3,
    saved_applications: 25,
  },
  pro: {
    analyses_per_month: Infinity,
    cv_generations_per_month: Infinity,
    cover_letters_per_month: Infinity,
    saved_applications: Infinity,
  },
  sprint: {
    analyses_per_month: Infinity,
    cv_generations_per_month: Infinity,
    cover_letters_per_month: Infinity,
    saved_applications: Infinity,
  },
} as const;

// Pricing (no annual plan — job search is 3-5 months)
export const PRICING = {
  pro_monthly: 19,
  sprint_weekly: 7,
  currency: "USD",
} as const;

// Position assessment thresholds (transparent, rule-based)
export const POSITION_THRESHOLDS = {
  strong: 90,      // 90%+ hard requirements with evidence
  competitive: 75,  // 75%+ hard requirements with evidence
  stretch: 50,      // 50%+ hard requirements with evidence
  // Below 50% = "Major gaps"
} as const;

// Application stage display (pipeline stages)
export const STAGE_LABELS: Record<string, string> = {
  saved: "Saved",
  analyzing: "Analyzing",
  ready_to_apply: "Ready to Apply",
  applied: "Applied",
};

export const STAGE_COLORS: Record<string, string> = {
  saved: "gray",
  analyzing: "blue",
  ready_to_apply: "yellow",
  applied: "indigo",
};

// Outcome status display (user-updated after applying)
export const OUTCOME_LABELS: Record<string, string> = {
  pending: "Pending",
  callback: "Callback",
  interview: "Interview",
  offer: "Offer",
  closed: "Closed",
  ghosted: "No Response",
};

export const OUTCOME_COLORS: Record<string, string> = {
  pending: "gray",
  callback: "blue",
  interview: "purple",
  offer: "green",
  closed: "slate",
  ghosted: "zinc",
};

// Kanban board columns (5 columns, Callback shown as badge on Applied cards)
export const KANBAN_COLUMNS = [
  "wishlist",
  "applied",
  "interview",
  "offer",
  "closed",
] as const;

export const KANBAN_LABELS: Record<string, string> = {
  wishlist: "Wishlist",
  applied: "Applied",
  interview: "Interview",
  offer: "Offer",
  closed: "Closed",
};

// CV Templates — rendering config for @react-pdf/renderer
export const CV_TEMPLATES = {
  professional: {
    label: "Professional",
    description: "Corporate, finance, consulting",
    font: "inter" as const,
    accent_color: "#1e3a5f",
    body_size: 11,
    header_size: 14,
    name_size: 18,
    margins: { top: 72, right: 72, bottom: 72, left: 72 }, // 1" in points
    bullet_spacing: 8,
    section_spacing: 16,
    header_style: "uppercase-border" as const, // UPPERCASE + thin bottom border
  },
  technical: {
    label: "Technical",
    description: "Engineering, dev, data, infrastructure",
    font: "inter" as const,
    accent_color: "#334155",
    body_size: 10,
    header_size: 12,
    name_size: 16,
    margins: { top: 50, right: 50, bottom: 50, left: 50 }, // 0.7" in points
    bullet_spacing: 4,
    section_spacing: 12,
    header_style: "mono-bold" as const, // monospace-style, bold, no border
  },
  modern: {
    label: "Modern",
    description: "Startups, product, marketing",
    font: "inter" as const,
    accent_color: "#0d9488",
    body_size: 10.5,
    header_size: 12,
    name_size: 17,
    margins: { top: 61, right: 61, bottom: 61, left: 61 }, // 0.85" in points
    bullet_spacing: 6,
    section_spacing: 14,
    header_style: "left-border" as const, // teal left border, sentence case
  },
} as const;

// Default section order per persona
export const PERSONA_SECTION_ORDER: Record<string, string[]> = {
  early_career:   ["summary", "education", "skills", "experience", "certifications"],
  mid_career:     ["summary", "experience", "skills", "education", "certifications"],
  senior:         ["summary", "experience", "skills", "education", "certifications"],
  executive:      ["summary", "experience", "skills", "education", "certifications"],
  career_changer: ["summary", "skills", "experience", "education", "certifications"],
  freelancer:     ["summary", "skills", "experience", "certifications", "education"],
  returner:       ["summary", "skills", "experience", "education", "certifications"],
  laid_off:       ["summary", "experience", "skills", "education", "certifications"],
  military:       ["summary", "experience", "skills", "certifications", "education"],
  default:        ["summary", "experience", "skills", "education", "certifications"],
};
