import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const pages = readdirSync(root).filter(name => name.endsWith('.html'));

test('every page has essential metadata, one main heading and accessible images', () => {
  for (const page of pages) {
    const html = readFileSync(join(root, page), 'utf8');
    assert.match(html, /<html\b[^>]*\blang="uk"/i, page);
    assert.match(html, /<title>[^<]+<\/title>/i, page);
    assert.match(html, /<meta\b[^>]*name="description"[^>]*content="[^"]+"/i, page);
    assert.equal((html.match(/<h1\b/gi) ?? []).length, 1, `${page}: expected one h1`);
    for (const image of html.match(/<img\b[^>]*>/gi) ?? []) {
      assert.match(image, /\balt="[^"]*"/i, `${page}: image needs alt text`);
    }
  }
});

test('local page links and media references resolve to real files', () => {
  for (const page of pages) {
    const html = readFileSync(join(root, page), 'utf8');
    for (const [, raw] of html.matchAll(/\b(?:src|href|data-src)="([^"]+)"/gi)) {
      if (/^(?:https?:|data:|mailto:|tel:|#|\/)/i.test(raw)) continue;
      const path = raw.split(/[?#]/, 1)[0];
      if (!/\.(?:html|css|js|svg|png|jpe?g|webp|mp4)$/i.test(path)) continue;
      const target = resolve(dirname(join(root, page)), path);
      assert.ok(!relative(root, target).startsWith('..'), `${page}: reference leaves the project: ${raw}`);
      assert.ok(existsSync(target), `${page}: missing ${raw}`);
    }
  }
});
