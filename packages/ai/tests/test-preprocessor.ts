/**
 * Test text-preprocessor against all 9 CVs in Supabase.
 * Run: npx tsx packages/ai/tests/test-preprocessor.ts
 */
import { createClient } from '@supabase/supabase-js';
import { preprocessExtractedText } from '../src/text-preprocessor';

const sb = createClient(
  'https://koyqjfatxreyaaynflrn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtveXFqZmF0eHJleWFheW5mbHJuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzY1ODg5NSwiZXhwIjoyMDkzMjM0ODk1fQ.mND_hkB1LWOJdR0ETYAMu_5vW33Tk9Hwhsuy_dWaO8Y'
);

async function main() {
  const { data, error } = await sb
    .from('cv_uploads')
    .select('filename, extracted_text')
    .eq('user_id', 'c18c4ee1-8f3d-46e2-80b2-de4a527e8c6a');

  if (error || !data) {
    console.error('Failed to fetch:', error);
    return;
  }

  for (const cv of data) {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`CV: ${cv.filename}`);
    console.log('='.repeat(70));

    const result = preprocessExtractedText(cv.extracted_text);

    console.log(`Sections found: ${result.sectionsFound.join(', ')}`);
    console.log(`Role headers in experience: ${result.roleHeadersFound}`);
    console.log(`Displaced titles fixed: ${result.displacedTitlesFixed}`);
    console.log(`Changes made (${result.changes.length}):`);
    for (const c of result.changes) {
      console.log(`  - ${c}`);
    }

    // Show annotated lines
    const outLines = result.text.split('\n');
    const annotatedLines = outLines
      .map((l, i) => ({ line: l, num: i + 1 }))
      .filter(x => x.line.includes('['));
    if (annotatedLines.length > 0) {
      console.log(`\nAnnotated lines:`);
      for (const al of annotatedLines) {
        console.log(`  L${al.num}: ${al.line.trim().substring(0, 100)}`);
      }
    }
  }
}

main().catch(console.error);
