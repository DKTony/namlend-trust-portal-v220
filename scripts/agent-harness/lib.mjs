import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

export const ROOT = process.cwd();
export const HARNESS_DIR = path.join(ROOT, 'agent-harness');

export function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

export function digestFile(file) {
  return `sha256:${crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')}`;
}

export function git(args, fallback = '') {
  try {
    return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  } catch {
    return fallback;
  }
}

export function schemaValidator(schemaName) {
  const schema = readJson(path.join(HARNESS_DIR, 'schemas', schemaName));
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  addFormats(ajv);
  const validate = ajv.compile(schema);
  return (value, label = schemaName) => {
    if (!validate(value)) {
      const details = (validate.errors ?? []).map((error) => `${error.instancePath || '/'} ${error.message}`).join('; ');
      throw new Error(`${label} does not satisfy ${schemaName}: ${details}`);
    }
    return value;
  };
}

export function matchGlob(file, pattern) {
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replaceAll('**/', '(?:.*/)?')
    .replaceAll('**', '.*')
    .replaceAll('*', '[^/]*');
  return new RegExp(`^${escaped}$`).test(file.replaceAll('\\', '/'));
}

export function matchesAny(file, patterns) {
  return patterns.some((pattern) => matchGlob(file, pattern));
}

export function changedPaths(baseSha) {
  const tracked = git(['diff', '--name-only', '--diff-filter=ACMRTUXB', baseSha, '--'])
    .split('\n')
    .filter(Boolean);
  const untracked = git(['ls-files', '--others', '--exclude-standard'])
    .split('\n')
    .filter(Boolean);
  return [...new Set([...tracked, ...untracked])].sort();
}

export function impactPaths(startId, nodes, edges) {
  const reverse = new Map();
  for (const edge of edges) {
    if (edge.attributes?.structural || ['CONTAINS', 'DOCUMENTED_IN', 'DEPLOYED_BY', 'TESTED_BY'].includes(edge.type)) continue;
    if (!reverse.has(edge.to)) reverse.set(edge.to, []);
    reverse.get(edge.to).push(edge);
  }
  const results = [];
  const queue = (reverse.get(startId) ?? []).map((edge) => ({ current: edge.from, path: [edge] }));
  const visited = new Set();
  while (queue.length) {
    const item = queue.shift();
    if (visited.has(item.current) || item.current === startId || !nodes.has(item.current)) continue;
    visited.add(item.current);
    results.push({ targetId: item.current, depth: item.path.length, edges: item.path.map((edge) => edge.id) });
    for (const edge of reverse.get(item.current) ?? []) queue.push({ current: edge.from, path: [...item.path, edge] });
  }
  return results;
}

export function validateTaskPolicy(task, policy) {
  const violations = [];
  if (!policy.autonomousRiskClasses.includes(task.riskClass)) {
    violations.push({ severity: 'hard', code: 'RISK_CLASS_NOT_AUTONOMOUS', message: `${task.riskClass} tasks require a human-led workflow.` });
  }
  if (task.resourceBudget.maxMinutes > policy.maxRunMinutes || task.resourceBudget.maxAttempts > policy.maxAttempts) {
    violations.push({ severity: 'hard', code: 'RESOURCE_BUDGET_EXCEEDED', message: 'Task budget exceeds repository policy.' });
  }
  if (Date.parse(task.expiresAt) <= Date.now()) {
    violations.push({ severity: 'hard', code: 'TASK_EXPIRED', message: 'Task contract has expired.' });
  }
  for (const operation of policy.alwaysForbiddenOperations) {
    if (!task.forbiddenOperations.includes(operation)) {
      violations.push({ severity: 'hard', code: 'FORBIDDEN_OPERATION_NOT_DECLARED', message: `${operation} must be explicitly forbidden.` });
    }
  }
  if (task.riskClass === 'R0' && task.allowedPaths.length) {
    violations.push({ severity: 'hard', code: 'R0_WRITE_SCOPE', message: 'R0 contracts cannot authorize writable paths.' });
  }
  if (task.riskClass === 'R1') {
    for (const allowed of task.allowedPaths) {
      if (matchesAny(allowed, policy.protectedPatterns)) {
        violations.push({ severity: 'hard', code: 'PROTECTED_PATH_AUTHORIZED', path: allowed, message: 'R1 cannot authorize a protected path.' });
      } else if (!matchesAny(allowed, policy.r1AllowedPatterns)) {
        violations.push({ severity: 'hard', code: 'R1_PATH_NOT_ALLOWLISTED', path: allowed, message: 'R1 path is outside the autonomous allowlist.' });
      }
    }
  }
  return violations;
}

export function validateChangedPaths(task, policy, paths) {
  const violations = [];
  if (task.riskClass === 'R0' && paths.length) {
    violations.push({ severity: 'hard', code: 'R0_REPOSITORY_WRITE', paths, message: 'A read-only task changed repository files.' });
    return violations;
  }
  for (const changed of paths) {
    if (matchesAny(changed, policy.protectedPatterns)) {
      violations.push({ severity: 'hard', code: 'PROTECTED_PATH_CHANGED', path: changed, message: 'Autonomous work changed a protected path.' });
      continue;
    }
    if (!task.allowedPaths.some((allowed) => matchGlob(changed, allowed) || matchGlob(allowed, changed))) {
      violations.push({ severity: 'hard', code: 'OUT_OF_SCOPE_CHANGE', path: changed, message: 'Changed path is outside the task contract.' });
    }
  }
  return violations;
}

export function validateExceptions(policy) {
  const registry = readJson(path.join(HARNESS_DIR, 'exceptions.json'));
  const validate = schemaValidator('policy-exception.schema.json');
  const gaps = readJson(path.join(ROOT, 'ontology', 'gaps.json')).gaps;
  const gapIds = new Set(gaps.map((gap) => gap.id));
  const errors = [];
  for (const exception of registry.exceptions) {
    try {
      validate(exception, exception.id);
    } catch (error) {
      errors.push(error.message);
      continue;
    }
    const created = Date.parse(exception.createdAt ?? new Date(0).toISOString());
    const expires = Date.parse(exception.expiresAt);
    const maximumMs = policy.exceptionMaximumDays[exception.category] * 86_400_000;
    if (expires - created > maximumMs) errors.push(`${exception.id} exceeds the ${policy.exceptionMaximumDays[exception.category]} day maximum.`);
    if (expires <= Date.now()) errors.push(`${exception.id} has expired.`);
    if (!gapIds.has(exception.gapId)) errors.push(`${exception.id} references missing ${exception.gapId}.`);
  }
  return errors;
}

export function scanForSensitiveReceiptData(value) {
  const serialized = JSON.stringify(value);
  const patterns = [
    /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
    /(?:password|secret|token|api[_-]?key)\s*[=:]\s*["'][^"']{6,}/i,
    /sk-[A-Za-z0-9_-]{16,}/,
  ];
  return patterns.filter((pattern) => pattern.test(serialized)).map((pattern) => String(pattern));
}

export function printJson(value) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}
