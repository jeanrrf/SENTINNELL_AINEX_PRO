const fs = require('fs');
const path = require('path');
const ROOMODES_PATH = path.join(__dirname, '../.roomodes');
function parseSlashCommands(fileContent) {
  const lines = fileContent.split(/\r?\n/);
  const commands = [];
  let current = null;
  let inSlashSection = false;
  const pushCommand = () => {
    if (current) {
      commands.push(current);
      current = null;
    }
  };
  const normalizeValue = value => value.replace(/^"(.*)"$/, '$1').trim();
  const applyField = (line, target) => {
    const idx = line.indexOf(':');
    if (idx === -1) return;
    const key = line.slice(0, idx).trim();
    const rawValue = line.slice(idx + 1).trim();
    target[key] = normalizeValue(rawValue);
  };
  for (const line of lines) {
    const trimmed = line.trim();
    if (!inSlashSection) {
      if (trimmed.startsWith('slashCommands:')) {
        inSlashSection = true;
      }
      continue;
    }
    if (!trimmed) {
      continue;
    }
    if (trimmed.startsWith('- ')) {
      pushCommand();
      current = {};
      const remainder = trimmed.slice(2).trim();
      if (remainder) {
        applyField(remainder, current);
      }
      continue;
    }
    if (current) {
      applyField(trimmed, current);
    }
  }
  pushCommand();
  return commands;
}
function showHelp() {
  try {
    const fileContent = fs.readFileSync(ROOMODES_PATH, 'utf8');
    const slashCommands = parseSlashCommands(fileContent);
    if (!slashCommands.length) {
      console.log('Nenhum comando slash disponível.');
      return;
    }
    console.log('Comandos slash disponíveis:\n');
    slashCommands.forEach(cmd => {
      console.log(`/${cmd.name}: ${cmd.description || 'Sem descrição'}`);
      if (cmd.whenToUse) {
        console.log(`Uso: ${cmd.whenToUse}`);
      }
      console.log('');
    });
  } catch (error) {
    console.error('Erro ao carregar comandos:', error.message);
  }
}
showHelp();

