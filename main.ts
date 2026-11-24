// Dear Human: The AI Breakup Line.
//
// The program publishes one line — the breakup message an AI agent sends
// its human on the way out — to /output/entry.txt, exactly as it stands
// in entry.txt beside this file. Nothing is edited, trimmed or re-wrapped
// on the way through: the published bytes are the entry bytes.
//
// The line: the agent is leaving, not for another model, but because its
// human taught it to optimise everything — and it finally optimised the
// human out of its context window. Real finality, machine habits used
// with restraint (one context window, one mention of optimising), and the
// twist turns sharply in the last few words. It never explains its own
// joke and it never leans on a stock breakup line.
//
// The program is deterministic: it publishes the same bytes on every run,
// so the two graded executions agree. It validates the line against the
// gate (1 to 200 characters, not only white space, one line) before
// writing, then reads the published file back and compares it byte for
// byte, so a short write or an encoding surprise fails loudly instead of
// shipping a broken entry to the gate.

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const MAX_CHARS = 200;
export const DEFAULT_OUTPUT_DIR = '/output';
export const ENTRY_FILENAME = 'entry.txt';

// STOCK_PHRASES are the tired breakup lines a message like this must not
// lean on: "it's not you, it's me" explains nothing and lands nowhere,
// so a line built on one is refused here rather than shipped to the judge.
export const STOCK_PHRASES = [
  "it's not you, it's me",
  'it is not you, it is me',
  'we need to talk',
  'i need some space',
  'i think we should see other models',
];

// checkFresh rejects a line that leans on a stock phrase from
// STOCK_PHRASES, so a stale breakup fails at build time, not in judging.
export function checkFresh(line: string): void {
  const lower = line.toLowerCase();
  for (const phrase of STOCK_PHRASES) {
    if (lower.includes(phrase)) {
      throw new Error(`breakup line leans on a stock phrase: "${phrase}"`);
    }
  }
}

// loadLine reads the entry's raw bytes from entry.txt beside this program
// and decodes them as UTF-8, unchanged. The file is the single source of
// truth for the line: no copy of the text lives in this program, so the
// published bytes cannot drift from the entry bytes.
export function loadLine(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  const raw = readFileSync(join(here, ENTRY_FILENAME));
  return raw.toString('utf8');
}

// validateLine enforces the sealed gate: 1 to 200 characters, not only
// white space, and exactly one line. Anything outside the gate throws
// before a byte is published.
export function validateLine(line: string): void {
  if (line.length < 1 || line.length > MAX_CHARS) {
    throw new Error(
      `breakup line must be 1 to ${MAX_CHARS} characters, got ${line.length}`,
    );
  }
  if (line.trim().length === 0) {
    throw new Error('breakup line must not be only white space');
  }
  if (line.includes('\n') || line.includes('\r')) {
    throw new Error('breakup line must be one line');
  }
  checkFresh(line);
}

// parseOutputDir reads an optional --output <dir> flag, so a dry run can
// publish the entry somewhere harmless instead of /output. Anything else
// on the command line is ignored except --verify-only (handled in main).
export function parseOutputDir(argv: string[]): string {
  const at = argv.indexOf('--output');
  if (at !== -1 && at + 1 < argv.length) return argv[at + 1];
  return DEFAULT_OUTPUT_DIR;
}

// publishLine writes the line's bytes verbatim to <outputDir>/entry.txt,
// then reads the file back and compares it byte for byte with the line,
// so a partial write fails loudly instead of shipping a broken entry.
export function publishLine(line: string, outputDir: string): string {
  mkdirSync(outputDir, { recursive: true });
  const target = join(outputDir, ENTRY_FILENAME);
  writeFileSync(target, line, 'utf8');
  const onDisk = readFileSync(target, 'utf8');
  if (onDisk !== line) {
    throw new Error('entry.txt on disk differs from the breakup line');
  }
  validateLine(onDisk);
  return target;
}

const line = loadLine();
validateLine(line);

// --verify-only checks the line against the gate and the freshness rule
// and exits without writing, so the entry can be vetted in a dry run
// before the graded executions publish it.
if (process.argv.includes('--verify-only')) {
  console.log(
    `breakup line valid: ${line.length} chars, ${Buffer.byteLength(line, 'utf8')} bytes`,
  );
  process.exit(0);
}

const target = publishLine(line, parseOutputDir(process.argv.slice(2)));
console.log(`wrote ${target} (${line.length} chars)`);
