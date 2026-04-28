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

// Pricing
export const PRICING = {
  pro_monthly: 19,
  pro_yearly: 149,
  sprint_weekly: 9,
  currency: "USD",
} as const;

// Position assessment thresholds (transparent, rule-based)
export const POSITION_THRESHOLDS = {
  strong: 90,      // 90%+ hard requirements with evidence
  competitive: 75,  // 75%+ hard requirements with evidence
  stretch: 50,      // 50%+ hard requirements with evidence
  // Below 50% = "Major gaps"
} as const;

// Application status display
export const STATUS_LABELS: Record<string, string> = {
  saved: "Saved",
  analyzing: "Analyzing",
  ready_to_apply: "Ready to Apply",
  applied: "Applied",
  interviewing: "Interviewing",
  offered: "Offered",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
  no_response: "No Response",
};

export const STATUS_COLORS: Record<string, string> = {
  saved: "gray",
  analyzing: "blue",
  ready_to_apply: "yellow",
  applied: "indigo",
  interviewing: "purple",
  offered: "green",
  rejected: "red",
  withdrawn: "orange",
  no_response: "gray",
};
