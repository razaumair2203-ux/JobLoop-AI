# Dev Data — Local AI Development

During development, instead of calling the Anthropic API, you process
prompts through Claude Code (VS Code extension) and save the results here.

## How it works

1. Put your real CV in `inputs/my-cv.txt`
2. Put a real JD in `inputs/jd-001.txt`
3. Run the dev script: `npx tsx tests/dev-run.ts`
4. It outputs the prompt to process → paste into Claude Code
5. Save Claude's response to the appropriate file
6. Run again — this time it uses the cached response

## Directory structure

```
dev-data/
├── inputs/          ← Your real CV and JDs go here
│   ├── my-cv.txt
│   ├── jd-001.txt
│   └── jd-002.txt
├── responses/       ← Cached AI responses (JSON)
│   ├── cv-parse-{hash}.json
│   ├── jd-parse-{hash}.json
│   └── narrate-{hash}.json
├── prompts/         ← Generated prompts (for manual processing)
│   ├── cv-parse-{hash}.txt
│   └── jd-parse-{hash}.txt
└── cloud/           �� Your profile cloud (persisted)
    └── my-cloud.json
```

## Workflow

### First time (building your cloud):
1. Add your CV to `inputs/my-cv.txt`
2. Ask Claude Code: "Parse this CV using the CV_PARSER_SYSTEM_PROMPT and return JSON"
3. Save the JSON to `responses/`
4. Run `npx tsx tests/dev-run.ts` — it builds your cloud

### Each new JD:
1. Add the JD to `inputs/`
2. Ask Claude Code to parse it
3. Run the matcher — see what matches, what's missing
4. Iterate on your CV based on the results
