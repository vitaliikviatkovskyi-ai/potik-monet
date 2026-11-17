import { cp, mkdir, readdir, rm } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';

const output = resolve(process.cwd(), 'dist');
if (relative(process.cwd(), output) !== 'dist') throw new Error('Некоректна папка збірки.');
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
for (const entry of await readdir(process.cwd(), { withFileTypes: true })) {
  if (entry.isFile() && entry.name.endsWith('.html')) {
    await cp(entry.name, join(output, entry.name));
  }
}
for (const directory of ['assets', 'css', 'js']) {
  await cp(directory, join(output, directory), { recursive: true });
}
console.log('Статичні файли сайту підготовлено в dist/');
