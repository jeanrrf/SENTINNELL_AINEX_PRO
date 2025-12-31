const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const IGNORE_DIRS = new Set([
  '.git',
  '.vscode',
  '.roo',
  'node_modules',
  'dist',
  'build',
  'coverage',
  '.next',
  'out'
]);
const IGNORE_PATH_PREFIXES = [
  'backend/data/',
  'frontend/dist/',
  'frontend/build/'
];
const IGNORE_FILES = new Set([
  'package-lock.json',
  'yarn.lock',
  'pnpm-lock.yaml',
  'bun.lockb'
]);
const TEXT_EXTENSIONS = new Set([
  '.js',
  '.cjs',
  '.mjs',
  '.jsx',
  '.ts',
  '.tsx',
  '.json',
  '.css',
  '.scss',
  '.html',
  '.md',
  '.txt',
  '.yml',
  '.yaml',
  '.env',
  '.toml',
  '.ini',
  '.conf',
  '.sql',
  '.ps1',
  '.sh',
  '.bat',
  '.cmd'
]);
const TEXT_FILENAMES = new Set([
  '.gitignore',
  '.gitattributes',
  '.npmrc',
  '.nvmrc',
  '.editorconfig',
  '.eslintrc',
  '.eslintrc.json',
  '.eslintrc.cjs',
  '.eslintrc.js',
  '.prettierrc',
  '.prettierrc.json',
  '.prettierrc.cjs',
  '.prettierrc.js'
]);

const args = new Set(process.argv.slice(2));
const checkOnly = args.has('--check');
const forceAggressive = args.has('--aggressive');
const threshold = getNumberArg('--threshold', 0.4);
const minLinesForAggressive = getNumberArg('--min-lines', 20);
const verbose = args.has('--verbose');

function getNumberArg(flag, fallback) {
  const index = process.argv.indexOf(flag);
  if (index === -1) return fallback;
  const value = Number(process.argv[index + 1]);
  return Number.isFinite(value) ? value : fallback;
}

function shouldIgnoreDir(name, relPath) {
  if (IGNORE_DIRS.has(name)) return true;
  const normalized = relPath.split(path.sep).join('/');
  return IGNORE_PATH_PREFIXES.some(prefix => normalized.startsWith(prefix));
}

function shouldProcessFile(name, relPath) {
  if (IGNORE_FILES.has(name)) return false;
  if (TEXT_FILENAMES.has(name)) return true;
  if (name.startsWith('.env')) return true;
  const ext = path.extname(name).toLowerCase();
  return TEXT_EXTENSIONS.has(ext);
}

function collectFiles(dir, files) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relPath = path.relative(ROOT_DIR, fullPath);
    if (entry.isDirectory()) {
      if (shouldIgnoreDir(entry.name, relPath)) continue;
      collectFiles(fullPath, files);
      continue;
    }
    if (!entry.isFile()) continue;
    if (!shouldProcessFile(entry.name, relPath)) continue;
    files.push(fullPath);
  }
}

function isBinary(buffer) {
  return buffer.includes(0);
}

function formatContent(content) {
  const hasBom = content.charCodeAt(0) === 0xfeff;
  const raw = hasBom ? content.slice(1) : content;
  const eol = raw.includes('\r\n') ? '\r\n' : '\n';
  const lines = raw.split(/\r?\n/);

  const totalLines = lines.length;
  const blankLines = lines.filter(line => line.trim() === '').length;
  const blankRatio = totalLines === 0 ? 0 : blankLines / totalLines;
  const aggressive = forceAggressive || (totalLines >= minLinesForAggressive && blankRatio >= threshold);

  const outputLines = [];
  let previousBlank = false;

  for (const line of lines) {
    const isBlank = line.trim() === '';
    if (aggressive) {
      if (isBlank) continue;
      outputLines.push(line);
      continue;
    }
    if (isBlank) {
      if (previousBlank) continue;
      outputLines.push('');
      previousBlank = true;
      continue;
    }
    previousBlank = false;
    outputLines.push(line);
  }

  const joined = outputLines.join(eol);
  const normalized = joined === '' ? '' : `${joined}${eol}`;
  return hasBom ? `\ufeff${normalized}` : normalized;
}

function run() {
  const files = [];
  collectFiles(ROOT_DIR, files);

  let changed = 0;
  let skippedBinary = 0;

  for (const filePath of files) {
    const buffer = fs.readFileSync(filePath);
    if (isBinary(buffer)) {
      skippedBinary += 1;
      continue;
    }
    const content = buffer.toString('utf8');
    const formatted = formatContent(content);
    if (formatted === content) continue;
    if (!checkOnly) {
      fs.writeFileSync(filePath, formatted, 'utf8');
    }
    changed += 1;
    if (verbose) {
      const relPath = path.relative(ROOT_DIR, filePath);
      console.log(`${checkOnly ? 'Would format' : 'Formatted'} ${relPath}`);
    }
  }

  const summary = [
    `files=${files.length}`,
    `changed=${changed}`,
    `binary_skipped=${skippedBinary}`,
    checkOnly ? 'mode=check' : 'mode=write'
  ].join(' ');
  console.log(`format-codebase done: ${summary}`);
  if (checkOnly && changed > 0) {
    process.exitCode = 1;
  }
}

run();

