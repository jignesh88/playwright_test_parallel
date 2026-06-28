#!/usr/bin/env -S npx tsx
/**
 * Read every *-result.json under one or more allure-results dirs, find the
 * failures, group them by Allure `owner` label (squad name), and emit a
 * Markdown report. Output goes to stdout so callers can pipe into
 * $GITHUB_STEP_SUMMARY, a PR comment, or a Slack payload.
 *
 * Usage:
 *   npx tsx scripts/squad-failure-report.ts <allure-results-dir>...
 *
 * Exit code:
 *   0  always — this is a reporter, not a gate. The test job already failed.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { SQUADS } from '../tests/support/squads';

type Label = { name: string; value: string };
type Parameter = { name: string; value: string };
type Status = 'passed' | 'failed' | 'broken' | 'skipped' | 'unknown';

type AllureResult = {
  name: string;
  fullName?: string;
  status: Status;
  statusDetails?: { message?: string; trace?: string };
  labels?: Label[];
  parameters?: Parameter[];
  start?: number;
  stop?: number;
};

type Failure = {
  name: string;
  fullName?: string;
  status: Status;
  message?: string;
  feature?: string;
  ownerName?: string;
  ownerEmail?: string;
};

const FAIL_STATUSES = new Set<Status>(['failed', 'broken']);

function readResults(dir: string): AllureResult[] {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return [];
  }
  const out: AllureResult[] = [];
  for (const entry of entries) {
    if (!entry.endsWith('-result.json')) continue;
    const full = join(dir, entry);
    try {
      if (!statSync(full).isFile()) continue;
      out.push(JSON.parse(readFileSync(full, 'utf8')) as AllureResult);
    } catch {
      // skip malformed
    }
  }
  return out;
}

function failureFromResult(r: AllureResult): Failure {
  const labelValue = (n: string) => r.labels?.find((l) => l.name === n)?.value;
  const paramValue = (n: string) => r.parameters?.find((p) => p.name === n)?.value;
  return {
    name: r.name,
    fullName: r.fullName,
    status: r.status,
    message: r.statusDetails?.message?.split('\n')[0]?.slice(0, 200),
    feature: labelValue('feature'),
    ownerName: labelValue('owner'),
    ownerEmail: paramValue('squadEmail'),
  };
}

function emailFor(ownerName: string | undefined): string | undefined {
  if (!ownerName) return undefined;
  return Object.values(SQUADS).find((s) => s.name === ownerName)?.email;
}

function groupByOwner(failures: Failure[]): Map<string, Failure[]> {
  const groups = new Map<string, Failure[]>();
  for (const f of failures) {
    const key = f.ownerName ?? '(unowned)';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(f);
  }
  return groups;
}

function renderMarkdown(groups: Map<string, Failure[]>, totalFailures: number): string {
  if (totalFailures === 0) return '## ✅ All tests passed\n\nNo squad notifications needed.\n';

  const lines: string[] = [];
  lines.push(`## ❌ ${totalFailures} test failure${totalFailures === 1 ? '' : 's'} by squad`);
  lines.push('');
  lines.push('| Squad | Email | Failed tests |');
  lines.push('|---|---|---|');

  const sortedOwners = [...groups.keys()].sort((a, b) => {
    // (unowned) last
    if (a === '(unowned)') return 1;
    if (b === '(unowned)') return -1;
    return a.localeCompare(b);
  });

  for (const owner of sortedOwners) {
    const failures = groups.get(owner)!;
    const email = emailFor(owner) ?? '—';
    lines.push(`| ${owner} | ${email} | ${failures.length} |`);
  }

  lines.push('');
  for (const owner of sortedOwners) {
    const failures = groups.get(owner)!;
    lines.push(`### ${owner} (${failures.length})`);
    lines.push('');
    for (const f of failures) {
      const feature = f.feature ? ` *(${f.feature})*` : '';
      const msg = f.message ? `\n  > ${f.message}` : '';
      lines.push(`- **${f.name}**${feature}${msg}`);
    }
    lines.push('');
  }
  return lines.join('\n');
}

function main() {
  const dirs = process.argv.slice(2);
  if (dirs.length === 0) {
    console.error('usage: squad-failure-report.ts <allure-results-dir>...');
    process.exit(2);
  }

  const allFailures: Failure[] = [];
  for (const dir of dirs) {
    for (const r of readResults(dir)) {
      if (FAIL_STATUSES.has(r.status)) {
        allFailures.push(failureFromResult(r));
      }
    }
  }

  const groups = groupByOwner(allFailures);
  process.stdout.write(renderMarkdown(groups, allFailures.length));
}

main();
