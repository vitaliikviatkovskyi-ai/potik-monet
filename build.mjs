import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';

const output = resolve(process.cwd(), 'dist');
if (relative(process.cwd(), output) !== 'dist') throw new Error('Некоректна папка збірки.');
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
for (const entry of await readdir(process.cwd(), { withFileTypes: true })) {
  if (entry.isFile() && /\.(?:html|txt|xml)$/.test(entry.name)) {
    if (entry.name === 'index.html') {
      let html = await readFile(entry.name, 'utf8');
      // Start the theme and hero video without waiting for separate script requests.
      for (const scriptPath of ['js/theme.js', 'js/hero-video.js']) {
        const tag = `<script src="${scriptPath}"></script>`;
        if (!html.includes(tag)) throw new Error(`Не знайдено скрипт ${scriptPath} у index.html.`);
        html = html.replace(tag, `<script>\n${await readFile(scriptPath, 'utf8')}\n</script>`);
      }
      await writeFile(join(output, entry.name), html);
    } else {
      await cp(entry.name, join(output, entry.name));
    }
  }
}
for (const directory of ['assets', 'css', 'js']) {
  await cp(directory, join(output, directory), { recursive: true });
}
console.log('Статичні файли сайту підготовлено в dist/');
