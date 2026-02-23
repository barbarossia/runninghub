import { spawn } from 'child_process';
import { existsSync } from 'fs';
import { mkdir, rename, rm, cp, writeFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const target = process.env.RUNNINGHUB_BUILD_TARGET || process.argv[2];

if (!['backend', 'frontend'].includes(target)) {
  console.error('RUNNINGHUB_BUILD_TARGET must be "backend" or "frontend"');
  process.exit(1);
}

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const appDir = path.join(rootDir, 'src', 'app');
const cacheRoot = path.join(rootDir, '.build-cache');
const fullAppDir = path.join(cacheRoot, 'app-full');

async function prepareAppTree() {
  if (!existsSync(appDir)) {
    throw new Error(`Missing app directory: ${appDir}`);
  }

  await rm(cacheRoot, { recursive: true, force: true });
  await mkdir(cacheRoot, { recursive: true });
  await rename(appDir, fullAppDir);

  await mkdir(appDir, { recursive: true });

  if (target === 'backend') {
    const apiDir = path.join(fullAppDir, 'api');
    await cp(apiDir, path.join(appDir, 'api'), { recursive: true });
    await writeFile(
      path.join(appDir, 'layout.tsx'),
      `import type { ReactElement, ReactNode } from 'react';\n\nexport default function RootLayout({ children }: { children: ReactNode }) {\n  return children as ReactElement;\n}\n`,
      'utf-8',
    );
    return;
  }

  await cp(fullAppDir, appDir, { recursive: true });
  await rm(path.join(appDir, 'api'), { recursive: true, force: true });
}

async function restoreAppTree() {
  if (existsSync(appDir)) {
    await rm(appDir, { recursive: true, force: true });
  }
  if (existsSync(fullAppDir)) {
    await rename(fullAppDir, appDir);
  }
  await rm(cacheRoot, { recursive: true, force: true });
}

async function runBuild() {
  return new Promise((resolve, reject) => {
    const child = spawn('npm', ['run', 'build'], {
      stdio: 'inherit',
      env: {
        ...process.env,
        RUNNINGHUB_BUILD_TARGET: target,
      },
      cwd: rootDir,
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`Build failed with code ${code}`));
    });

    child.on('error', (err) => reject(err));
  });
}

try {
  await prepareAppTree();
  await runBuild();
} finally {
  await restoreAppTree();
}
