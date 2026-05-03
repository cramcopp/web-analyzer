import { spawn } from 'node:child_process';

const args = process.argv.slice(2);
const command = process.platform === 'win32' ? 'opennextjs-cloudflare.cmd' : 'opennextjs-cloudflare';

const suppressedPatterns = [
  /WARN OpenNext is not fully compatible with Windows/i,
  /WARN For optimal performance, it is recommended to use Windows Subsystem for Linux/i,
  /WARN While OpenNext may function on Windows, it could encounter unpredictable failures during runtime/i,
  /\[DEP0040\].*punycode module is deprecated/i,
  /Use `node --trace-deprecation`.*punycode/i,
];

function pipeFiltered(stream, target) {
  let buffer = '';

  stream.on('data', (chunk) => {
    buffer += chunk.toString();
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (!suppressedPatterns.some((pattern) => pattern.test(line))) {
        target.write(`${line}\n`);
      }
    }
  });

  stream.on('end', () => {
    if (buffer && !suppressedPatterns.some((pattern) => pattern.test(buffer))) {
      target.write(buffer);
    }
  });
}

const env = {
  ...process.env,
  NODE_NO_WARNINGS: '1',
  NODE_OPTIONS: [process.env.NODE_OPTIONS, '--no-deprecation'].filter(Boolean).join(' '),
};

const child = spawn(command, args, {
  cwd: process.cwd(),
  env,
  shell: process.platform === 'win32',
  stdio: ['inherit', 'pipe', 'pipe'],
});

pipeFiltered(child.stdout, process.stdout);
pipeFiltered(child.stderr, process.stderr);

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});
