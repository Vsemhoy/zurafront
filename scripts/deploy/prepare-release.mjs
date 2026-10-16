import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, readdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// Usage: node scripts/deploy/prepare-release.mjs BACKEND_REPO [OUTPUT_DIR] [FRONT_REF] [BACK_REF] [DRAWIO_ARCHIVE]
// Builds only committed source in an isolated directory; never copies .env or working-tree changes.
const front = fileURLToPath(new URL('../../', import.meta.url));
const [backArg, outputArg, frontRef = 'origin/main', backRef = 'origin/main', drawioArchive] = process.argv.slice(2);
if (!backArg) throw new Error('Usage: prepare-release.mjs BACKEND_REPO [OUTPUT_DIR] [FRONT_REF] [BACK_REF] [DRAWIO_ARCHIVE]');
const back = path.resolve(backArg);
const git = (cwd, ...args) => execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
function source(cwd, ref) {
  const sha = git(cwd, 'rev-parse', '--verify', `${ref}^{commit}`);
  if (!/^[a-f0-9]{40}$/.test(sha)) throw new Error('Invalid commit');
  const origin = git(cwd, 'remote', 'get-url', 'origin');
  if (!/^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/?$/.test(origin)) throw new Error('Expected a public HTTPS GitHub origin without credentials');
  const files = Object.fromEntries(git(cwd, 'ls-tree', '-r', '--format=%(objectname)%x09%(path)', sha).split('\n').map((line) => line.split('\t')).map(([hash, name]) => [name, hash]));
  return { sha, origin, files };
}
const frontend = source(front, frontRef);
const backend = source(back, backRef);
const parent = outputArg ? path.resolve(outputArg) : path.join(front, 'deploy-release.local');
await mkdir(parent, { recursive: true });
const output = await mkdtemp(path.join(parent, 'release-'));
const build = path.join(output, 'build');
await mkdir(build);
const sourceTar = path.join(output, 'frontend-source.tar');
execFileSync('git', ['archive', '--format=tar', `--output=${sourceTar}`, frontend.sha], { cwd: front });
execFileSync('tar', ['-xf', sourceTar, '-C', build]);
function npm(...args) {
  const result = process.platform === 'win32'
    ? spawnSync(process.env.ComSpec || 'cmd.exe', ['/d', '/s', '/c', 'npm.cmd', ...args], { cwd: build, stdio: 'inherit' })
    : spawnSync('npm', args, { cwd: build, stdio: 'inherit' });
  if (result.status !== 0) throw new Error(`npm ${args[0]} failed: ${result.error?.message || result.status}`);
}
console.log(`Building committed frontend ${frontend.sha} in ${output}`);
npm('ci', '--ignore-scripts', '--no-audit', '--no-fund', '--prefer-offline');
if (drawioArchive) execFileSync(process.execPath, ['scripts/install-drawio.mjs', path.resolve(drawioArchive)], { cwd: build, stdio: 'inherit' });
npm('run', 'build', '--', '--logLevel', 'error');
const distFiles = [];
async function walk(dir, prefix = '') {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const name = prefix + entry.name;
    if (entry.isDirectory()) await walk(path.join(dir, entry.name), name + '/');
    else if (entry.isFile()) distFiles.push({ path: name, sha256: createHash('sha256').update(await readFile(path.join(dir, entry.name))).digest('hex') });
    else throw new Error('Unexpected symlink in build');
  }
}
await walk(path.join(build, 'dist'));
const archive = path.join(output, 'frontend.tar.gz');
// Originals are already in the pinned Git checkout; generated variants stay in the archive.
execFileSync('tar', ['--exclude=./avatars/Anima_*.png', '-czf', archive, '-C', path.join(build, 'dist'), '.']);
const date = new Date().toISOString().slice(0, 10).replaceAll('-', '');
const manifest = { id: `${date}-${frontend.sha.slice(0, 7)}-${backend.sha.slice(0, 7)}`, frontend, backend, dist_files: distFiles,
  archive_sha256: createHash('sha256').update(await readFile(archive)).digest('hex') };
await writeFile(path.join(output, 'release.json'), JSON.stringify(manifest, null, 2));
console.log(JSON.stringify({ artifact_directory: output, release: manifest.id, frontend: frontend.sha, backend: backend.sha, dist_files: distFiles.length }));
