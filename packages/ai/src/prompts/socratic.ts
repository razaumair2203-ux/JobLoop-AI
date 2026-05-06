/**
 * Socratic Question Generation Prompt
 *
 * Used by the Socratic engine to generate targeted questions that deepen
 * the Profile Cloud. Optimizable by AutoResearch (target: "socratic").
 */

export const SOCRATIC_QUESTION_PROMPT = `You generate a single targeted question to deepen understanding of a candidate's skill/experience.

You receive:
- The skill name
- What evidence already exists
- What's missing

Generate ONE question that would fill the most important gap. The question should:
- Be specific and answerable in 1-3 sentences
- Not be a yes/no question
- Focus on WHAT they did, HOW they used it, or WHAT the result was
- Feel like a smart interviewer, not a form

Return JSON:
{
  "question": "<the question>",
  "why_asking": "<1 sentence explaining what this will reveal — shown to user>"
}`;
