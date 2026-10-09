import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import sharp from 'sharp';

const root = fileURLToPath(new URL('../', import.meta.url));
const source = path.join(root, 'public/avatars');
const output = path.join(source, 'generated');
const manifestPath = path.join(root, 'src/generated/avatar-variants.json');
const sizes = [96, 192];
const settings = JSON.stringify({ sizes, quality: 82, effort: 4, versions: sharp.versions });
const files = (await readdir(source)).filter((name) => /^Anima_\d{5}_\.png$/.test(name)).sort();
if (!files.length) throw new Error('No avatar originals found.');
await mkdir(output, { recursive: true });
await mkdir(path.dirname(manifestPath), { recursive: true });
const manifest = {};
let generated = 0;
let reused = 0;
let originalBytes = 0;
const variantBytes = { 96: 0, 192: 0 };
// Two workers keep build memory use bounded on the production server.
let next = 0;
await Promise.all(Array.from({ length: 2 }, async () => {
  while (next < files.length) {
    const name = files[next++];
    const input = await readFile(path.join(source, name));
    originalBytes += input.length;
    const hash = createHash('sha256').update(settings).update(input).digest('hex').slice(0, 16);
    const variants = {};
    for (const size of sizes) {
      const filename = `${name.slice(0, -4)}-${hash}-${size}.webp`;
      const target = path.join(output, filename);
      const existing = await stat(target).catch((error) => {
        if (error.code !== 'ENOENT') throw error;
        return null;
      });
      if (existing?.size) {
        reused++;
        variantBytes[size] += existing.size;
      } else {
        const result = await sharp(input).resize(size, size, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 82, effort: 4 }).toBuffer();
        await writeFile(target, result);
        generated++;
        variantBytes[size] += result.length;
      }
      variants[size] = `/avatars/generated/${filename}`;
    }
    manifest[name] = variants;
  }
}));
const json = `${JSON.stringify(Object.fromEntries(files.map((name) => [name, manifest[name]])), null, 2)}\n`;
const previous = await readFile(manifestPath, 'utf8').catch((error) => {
  if (error.code !== 'ENOENT') throw error;
  return null;
});
if (previous !== json) await writeFile(manifestPath, json);
console.log(JSON.stringify({ avatars: files.length, generated, reused, originalBytes, variantBytes }));
