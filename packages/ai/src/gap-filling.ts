/**
 * Gap-Filling Question Templates
 *
 * When the conflict detector finds roles with missing descriptions,
 * these templates generate targeted questions to fill the gaps.
 *
 * Two-zone architecture (matches Socratic engine design):
 *   Zone 1: Template-based questions — NO API call, instant ($0)
 *   Zone 2: Answer parsing — 1 fast tier call to extract structured evidence
 *
 * This module handles Zone 1 only. Zone 2 reuses the existing
 * Socratic answer processing in socratic.ts.
 */

import type { UserPersona } from "@jobloop/shared";

// ============================================================
// TYPES
// ============================================================

export interface GapFillingQuestion {
  id: string;
  /** The role this question is about */
  role: {
    title: string;
    company: string;
    start_date: string;
    end_date: string;
  };
  /** The question text */
  question: string;
  /** Why we're asking (shown to user) */
  why_asking: string;
  /** What kind of information we're seeking */
  seeking: "responsibilities" | "achievements" | "skills" | "team_size" | "scope";
  /** Placeholder/hint text for the answer field */
  placeholder: string;
  /** Priority order (lower = ask first) */
  priority: number;
}

export interface GapFillingContext {
  /** Role with missing descriptions */
  role: {
    title: string;
    company: string;
    start_date: string;
    end_date: string;
    location?: string;
    has_bullets: boolean;
    bullet_count: number;
  };
  /** User's persona (affects question framing) */
  persona: UserPersona | null;
  /** Whether this role is part of a rotational group */
  is_rotational: boolean;
  /** Employer group context (if rotational) */
  employer_context?: string;
  /** Whether this role was hidden (timeline gap fill) */
  is_hidden_role: boolean;
}

// ============================================================
// QUESTION TEMPLATES — NO LLM, $0
// ============================================================

/**
 * Generate gap-filling questions for a role with missing/thin descriptions.
 * Pure template logic — no API calls.
 *
 * @returns 2-4 targeted questions, persona-adjusted
 */
export function generateGapFillingQuestions(ctx: GapFillingContext): GapFillingQuestion[] {
  const questions: GapFillingQuestion[] = [];
  const { role, persona, is_rotational, is_hidden_role } = ctx;
  const roleLabel = `"${role.title}" at ${role.company}`;
  const baseId = `gap-${role.company}-${role.start_date}`.replace(/[^a-z0-9]/gi, "-").toLowerCase();

  // Q1: Core responsibilities (always ask if no bullets)
  if (!role.has_bullets || role.bullet_count === 0) {
    questions.push({
      id: `${baseId}-responsibilities`,
      role: { title: role.title, company: role.company, start_date: role.start_date, end_date: role.end_date },
      question: is_hidden_role
        ? `We noticed a gap in your timeline (${role.start_date} - ${role.end_date}). What were you doing during this period? What were your main responsibilities?`
        : is_rotational
        ? `As ${role.title} (${role.start_date} - ${role.end_date}), what were your main responsibilities? How did this posting differ from your other roles at ${role.company}?`
        : `What were your main responsibilities as ${role.title} at ${role.company}?`,
      why_asking: "We need to understand what you did in this role to build your profile accurately.",
      seeking: "responsibilities",
      placeholder: personaPlaceholder(persona, "responsibilities"),
      priority: 1,
    });
  }

  // Q2: Key achievement/impact (always ask — even with some bullets)
  if (role.bullet_count < 3) {
    questions.push({
      id: `${baseId}-achievement`,
      role: { title: role.title, company: role.company, start_date: role.start_date, end_date: role.end_date },
      question: personaAchievementQuestion(persona, roleLabel),
      why_asking: "Specific achievements with numbers make your profile much stronger than generic descriptions.",
      seeking: "achievements",
      placeholder: personaPlaceholder(persona, "achievements"),
      priority: 2,
    });
  }

  // Q3: Team/scope (ask for senior+ personas or if title suggests leadership)
  const isLeadershipTitle = /director|lead|head|manager|supervisor|officer/i.test(role.title);
  const isLeadershipPersona = persona && ["senior", "executive", "mid_career"].includes(persona);
  if (isLeadershipTitle || isLeadershipPersona) {
    questions.push({
      id: `${baseId}-scope`,
      role: { title: role.title, company: role.company, start_date: role.start_date, end_date: role.end_date },
      question: `How large was your team or scope of responsibility in this role? (team size, budget, number of projects, geographic reach)`,
      why_asking: "Scope and scale help employers understand your level of responsibility.",
      seeking: "team_size",
      placeholder: "e.g., Led a team of 15 engineers, managed $2M annual budget, oversaw 3 concurrent projects",
      priority: 3,
    });
  }

  // Q4: Technical skills (ask for technical personas or engineering titles)
  const isTechnicalTitle = /engineer|developer|architect|analyst|specialist|scientist|technical/i.test(role.title);
  const isTechnicalPersona = persona && ["early_career", "mid_career", "career_changer"].includes(persona);
  if (isTechnicalTitle || isTechnicalPersona) {
    questions.push({
      id: `${baseId}-skills`,
      role: { title: role.title, company: role.company, start_date: role.start_date, end_date: role.end_date },
      question: `What tools, technologies, or methodologies did you use most in this role?`,
      why_asking: "Specific tools and tech help match you to job requirements accurately.",
      seeking: "skills",
      placeholder: "e.g., JIRA, MATLAB, Python, MBSE, Agile/Scrum, configuration management, DOORS",
      priority: 4,
    });
  }

  return questions;
}

// ============================================================
// PERSONA-SPECIFIC QUESTION VARIANTS
// ============================================================

function personaAchievementQuestion(persona: UserPersona | null, roleLabel: string): string {
  switch (persona) {
    case "early_career":
      return `What's one thing you're most proud of from your time as ${roleLabel}? Any project you led, problem you solved, or skill you developed?`;
    case "military":
      return `What was your most significant accomplishment in this posting? Think: operational impact, readiness improvements, cost savings, or process improvements.`;
    case "executive":
      return `What strategic outcomes did you drive in this role? Think: revenue impact, organizational transformation, market expansion, or cost optimization.`;
    case "career_changer":
      return `What transferable skills did you develop in this role that apply to your target field? Any cross-functional projects or new capabilities you built?`;
    case "laid_off":
      return `What were your biggest wins in this role? Think about results you delivered, problems you solved, or improvements you drove.`;
    case "returner":
      return `Before your break, what were the key achievements from this role that you'd want employers to know about?`;
    case "freelancer":
      return `What was the most impactful project or deliverable from this engagement? What measurable results did you achieve for the client?`;
    default:
      return `What's your biggest achievement from this role? If possible, include a number — team size, budget, percentage improvement, revenue, etc.`;
  }
}

function personaPlaceholder(persona: UserPersona | null, seeking: string): string {
  if (seeking === "responsibilities") {
    switch (persona) {
      case "military":
        return "e.g., Managed operational readiness of weapons systems, led maintenance teams, coordinated field operations...";
      case "executive":
        return "e.g., Oversaw P&L for $50M division, led 200-person org through digital transformation...";
      case "early_career":
        return "e.g., Developed features for the mobile app, wrote unit tests, participated in code reviews...";
      default:
        return "e.g., Managed project timelines, coordinated with stakeholders, delivered quarterly reports...";
    }
  }

  if (seeking === "achievements") {
    switch (persona) {
      case "military":
        return "e.g., Improved fleet readiness from 75% to 92%, reduced maintenance turnaround by 30%...";
      case "executive":
        return "e.g., Grew revenue 40% YoY, led acquisition of 3 companies, reduced costs by $5M...";
      default:
        return "e.g., Reduced processing time by 40%, managed team of 12, delivered project 2 weeks early...";
    }
  }

  return "";
}

// ============================================================
// BATCH GAP ANALYSIS
// ============================================================

/**
 * Analyze all roles from a conflict report and generate gap-filling questions
 * for roles that have missing or thin descriptions.
 *
 * @param roles - All unique roles (after deduplication by conflict detector)
 * @param persona - User's persona for question framing
 * @returns Questions grouped by role, sorted by priority
 */
export function analyzeDescriptionGaps(
  roles: Array<{
    title: string;
    company: string;
    start_date: string;
    end_date: string;
    location?: string;
    bullets: string[];
    is_rotational?: boolean;
    is_hidden?: boolean;
  }>,
  persona: UserPersona | null,
): GapFillingQuestion[] {
  const allQuestions: GapFillingQuestion[] = [];

  for (const role of roles) {
    // Only generate questions for roles with thin descriptions
    if (role.bullets.length >= 3) continue;

    const questions = generateGapFillingQuestions({
      role: {
        title: role.title,
        company: role.company,
        start_date: role.start_date,
        end_date: role.end_date,
        location: role.location,
        has_bullets: role.bullets.length > 0,
        bullet_count: role.bullets.length,
      },
      persona,
      is_rotational: role.is_rotational ?? false,
      is_hidden_role: role.is_hidden ?? false,
    });

    allQuestions.push(...questions);
  }

  // Sort by priority (responsibilities first, then achievements, etc.)
  allQuestions.sort((a, b) => a.priority - b.priority);

  return allQuestions;
}
