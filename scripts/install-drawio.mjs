import { createHash } from 'node:crypto';
import { cp, mkdtemp, readFile, rm, writeFile, access } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const release = JSON.parse(await readFile(new URL('../src/entities/diagram/drawio-release.json', import.meta.url), 'utf8'));
const folder = `drawio-${release.version}`;
const output = path.join(root, 'public/vendor', folder);
const marker = path.join(output, 'zuratax-release.json');
try {
  if (JSON.parse(await readFile(marker, 'utf8')).sha256 === release.sha256) {
    await access(path.join(output, 'js/app.min.js'));
    console.log(`draw.io ${release.version}: local assets ready.`);
    process.exit(0);
  }
} catch { /* Install a missing or incomplete bundle. */ }

const stage = await mkdtemp(path.join(tmpdir(), 'zuratax-drawio-'));
try {
  const archive = path.join(stage, 'source.tar.gz');
  const localArchive = process.argv[2];
  let bytes;
  if (localArchive) bytes = await readFile(path.resolve(localArchive));
  else {
    console.log(`Downloading official draw.io ${release.version} (one-time setup)…`);
    const response = await fetch(`https://codeload.github.com/jgraph/drawio/tar.gz/refs/tags/v${release.version}`, { signal: AbortSignal.timeout(180000) });
    if (!response.ok) throw new Error(`draw.io download failed: ${response.status}`);
    bytes = Buffer.from(await response.arrayBuffer());
  }
  if (createHash('sha256').update(bytes).digest('hex') !== release.sha256) throw new Error('draw.io archive checksum mismatch.');
  await writeFile(archive, bytes);
  const unpack = spawnSync('tar', ['-xzf', archive, '-C', stage, `${folder}/src/main/webapp`, `${folder}/LICENSE`], { encoding: 'utf8' });
  if (unpack.status !== 0) throw new Error(unpack.stderr || 'Cannot extract draw.io; install tar.');
  const source = path.join(stage, folder, 'src/main/webapp');
  // Ship static browser assets only, never the Java backend or its configuration.
  await cp(source, output, { recursive: true, filter: (entry) => !['WEB-INF', 'META-INF'].includes(path.basename(entry)) });
  await cp(path.join(stage, folder, 'LICENSE'), path.join(output, 'LICENSE'));
  const csp = "default-src 'self' data: blob:; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; worker-src 'self' blob:; frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'";
  const indexPath = path.join(output, 'index.html');
  const index = await readFile(indexPath, 'utf8');
  await writeFile(indexPath, index.replace('<head>', `<head>\n<meta http-equiv="Content-Security-Policy" content="${csp}">`));
  const preconfig = path.join(output, 'js/PreConfig.js');
  await writeFile(preconfig, `${await readFile(preconfig, 'utf8')}\n${await readFile(new URL('./drawio-preconfig.js', import.meta.url), 'utf8')}`);
  await writeFile(marker, JSON.stringify(release));
  console.log(`Installed draw.io ${release.version}. Build includes it; no internet is needed at runtime.`);
} finally {
  if (path.dirname(stage) === tmpdir() && path.basename(stage).startsWith('zuratax-drawio-')) await rm(stage, { recursive: true, force: true });
}
