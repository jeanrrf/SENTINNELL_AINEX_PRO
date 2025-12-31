#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const backendEnvPath = path.resolve(__dirname, '..', 'backend', '.env');
const frontendEnvPath = path.resolve(__dirname, '..', 'frontend', '.env');
const DEFAULT_LIVE_MODEL = 'gemini-2.5-flash-native-audio-preview-09-2025';
function parseEnv(content) {
  return content.split(/\r?\n/).map(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) {
      return { type: 'raw', text: line };
    }
    const [key, ...rest] = line.split('=');
    return {
      type: 'entry',
      key: key.trim(),
      value: rest.join('=').trim(),
      text: line
    };
  });
}
function locateArg(key) {
  const argPrefix = `${key}=`;
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith(argPrefix)) {
      return arg.slice(argPrefix.length);
    }
  }
  return null;
}
function writeUpdatedEnv(parsed, updates) {
  const lines = [];
  for (const entry of parsed) {
    if (entry.type === 'entry' && updates.has(entry.key)) {
      const value = updates.get(entry.key);
      lines.push(`${entry.key}=${value}`);
      updates.delete(entry.key);
      continue;
    }
    lines.push(entry.text);
  }
  for (const [key, value] of updates.entries()) {
    if (lines.length && lines[lines.length - 1].trim() !== '') {
      lines.push('');
    }
    lines.push(`${key}=${value}`);
  }
  return lines.join('\n').trimEnd() + '\n';
}
function main() {
  if (!fs.existsSync(backendEnvPath)) {
    console.error(`Backend .env not found at ${backendEnvPath}`);
    process.exit(1);
  }
  const backendContent = fs.readFileSync(backendEnvPath, 'utf-8');
  const backendEntries = parseEnv(backendContent);
  const backendMap = new Map(backendEntries
    .filter(entry => entry.type === 'entry')
    .map(entry => [entry.key, entry.value]));
  const geminiKey = backendMap.get('GEMINI_API_KEY');
  if (!geminiKey) {
    console.error('GEMINI_API_KEY not defined in backend/.env');
    process.exit(1);
  }
  const liveModelArg = locateArg('--model') || locateArg('--live-model');
  const liveModelValue = liveModelArg || DEFAULT_LIVE_MODEL;
  const updates = new Map([
    ['VITE_GEMINI_API_KEY', geminiKey],
    ['VITE_GEMINI_LIVE_MODEL', liveModelValue]
  ]);
  const frontendContent = fs.existsSync(frontendEnvPath) ? fs.readFileSync(frontendEnvPath, 'utf-8') : '';
  const parsedFrontend = frontendContent ? parseEnv(frontendContent) : [];
  const newContent = writeUpdatedEnv(parsedFrontend, updates);
  fs.mkdirSync(path.dirname(frontendEnvPath), { recursive: true });
  fs.writeFileSync(frontendEnvPath, newContent, 'utf-8');
  console.log('Updated frontend/.env with:');
  console.log(`  VITE_GEMINI_API_KEY=${geminiKey}`);
  console.log(`  VITE_GEMINI_LIVE_MODEL=${liveModelValue}`);
}
main();

