import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const viteBin = resolve(projectRoot, 'node_modules', 'vite', 'bin', 'vite.js');
const env = {
  ...process.env,
  SUPABASE_URL: '',
  SUPABASE_PUBLISHABLE_KEY: '',
  SUPABASE_ANON_KEY: '',
  SUPABASE_SERVICE_ROLE_KEY: '',
  VITE_SUPABASE_URL: '',
  VITE_SUPABASE_PUBLISHABLE_KEY: '',
  VITE_SUPABASE_ANON_KEY: '',
  VITE_DEZ_SOMBRAS_QA: '1',
};

console.log('Iniciando a aplicação Vite standalone de QA Dez Sombras em http://127.0.0.1:5181/');
console.log('O servidor não usa a raiz TanStack do app e não toca no portal da porta 5180.');
console.log('Para encerrar, pressione Ctrl+C.');

const vite = spawn(process.execPath, [viteBin, 'dev', '--config', resolve(projectRoot, 'vite.config.qa.ts')], {
  cwd: projectRoot,
  env,
  stdio: 'inherit',
});

vite.on('error', error => {
  console.error('Falha ao iniciar o servidor QA:', error);
  process.exitCode = 1;
});
vite.on('close', code => {
  process.exitCode = code ?? 1;
});