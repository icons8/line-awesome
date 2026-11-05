// The three main fonts are the 1.3.0 fonts (font-source/1.3.0) plus the glyphs of added-icons.json.
// Every old glyph must keep its glyph id, codepoint, outline, advance and name, and the tables that
// do not list glyphs must be untouched, so pages that already use these fonts render as before.
import { describe, expect, test } from 'vitest';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import opentype from 'opentype.js';
import wawoff2 from 'wawoff2';
import { Resvg } from '@resvg/resvg-js';
import { readAdditions } from '../scripts/additions.mjs';
import { FONTS_DIR, FONT_OF_STYLE, SOURCE_DIR, drawFont, staleFiles } from '../scripts/build-font.mjs';
import { readCmap, readGlyphs, readTables } from '../scripts/ttf-splice.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const additions = readAdditions(root);
const read = (file) => readFileSync(join(root, file));
const parse = (buf) => opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.length));
const table = (buf, tag) => {
  const { offset, length } = readTables(buf).get(tag);
  return buf.subarray(offset, offset + length);
};
const cp = (hex) => parseInt(hex, 16);

// WOFF 1.0: a directory of zlib-compressed (or stored) tables.
function unwoff(buf) {
  const tables = new Map();
  for (let i = 0; i < buf.readUInt16BE(12); i++) {
    const at = 44 + i * 20;
    const [offset, packed, length] = [buf.readUInt32BE(at + 4), buf.readUInt32BE(at + 8), buf.readUInt32BE(at + 12)];
    const data = buf.subarray(offset, offset + packed);
    tables.set(buf.toString('latin1', at, at + 4), packed < length ? inflateSync(data) : data);
  }
  return tables;
}

const outline = (glyph) => JSON.stringify(glyph.path.commands);

test('the committed fonts and CSS match font-source/, svg/ and added-icons.json (run npm run build:font)', async () => {
  expect(await staleFiles(root)).toEqual([]);
});

test('font-source/1.3.0 is the original 1.3.0: its fonts hash the same as the legacy 1.3.0 fixture', () => {
  const legacy = JSON.parse(read('test/fixtures/legacy-1.3.0.sha256.json'));
  for (const name of Object.values(FONT_OF_STYLE)) {
    const expected = legacy[`${FONTS_DIR}/${name}.ttf`];
    expect(expected, `${name}.ttf is in the fixture`).toMatch(/^[0-9a-f]{64}$/);
    expect(createHash('sha256').update(read(`${SOURCE_DIR}/${name}.ttf`)).digest('hex'), name).toBe(expected);
  }
});

test('added icons have unique codepoints, none of them taken by a 1.3.0 glyph of any font', () => {
  expect(new Set(additions.map((icon) => icon.codepoint)).size).toBe(additions.length);
  expect(new Set(additions.map((icon) => icon.base)).size).toBe(additions.length);
  for (const name of Object.values(FONT_OF_STYLE)) {
    const old = readCmap(read(`${SOURCE_DIR}/${name}.ttf`));
    for (const icon of additions) expect(old.has(cp(icon.codepoint)), `${name} U+${icon.codepoint}`).toBe(false);
  }
});

describe.each(Object.entries(FONT_OF_STYLE))('%s: %s', (style, name) => {
  const added = additions.filter((icon) => icon.style === style);
  const base = read(`${SOURCE_DIR}/${name}.ttf`);
  const next = read(`${FONTS_DIR}/${name}.ttf`);
  const oldFont = parse(base);
  const newFont = parse(next);
  const oldGlyphs = readGlyphs(base);
  const newGlyphs = readGlyphs(next);
  const count = oldGlyphs.length;

  test('every 1.3.0 codepoint keeps its glyph id, outline, advance and name', () => {
    const oldMap = readCmap(base);
    expect(oldMap.size).toBeGreaterThan(100);
    for (const [codepoint, gid] of oldMap) {
      expect(newFont.charToGlyphIndex(String.fromCodePoint(codepoint)), `U+${codepoint.toString(16)}`).toBe(gid);
    }
    for (let gid = 0; gid < count; gid++) {
      const [before, after] = [oldFont.glyphs.get(gid), newFont.glyphs.get(gid)];
      if (outline(before) !== outline(after) || before.advanceWidth !== after.advanceWidth || before.name !== after.name) {
        throw new Error(`glyph ${gid} (${before.name}) changed`);
      }
    }
  });

  test('all Unicode cmap subtables list the old codepoints as before and the added ones besides', () => {
    for (const [platform, encoding] of [[0, 3], [0, 4], [3, 1], [3, 10]]) {
      const want = new Map(readCmap(base, platform, encoding));
      added.forEach((icon, i) => {
        if (cp(icon.codepoint) < 0xffff || encoding > 3) want.set(cp(icon.codepoint), count + i);
      });
      expect(readCmap(next, platform, encoding), `${platform}/${encoding}`).toEqual(want);
    }
  });

  test('metrics, GSUB and every table that does not list glyphs are untouched', () => {
    expect(newFont.unitsPerEm).toBe(oldFont.unitsPerEm);
    expect(newFont.ascender).toBe(oldFont.ascender);
    expect(newFont.descender).toBe(oldFont.descender);
    const { numberOfHMetrics, advanceWidthMax, minLeftSideBearing, minRightSideBearing, xMaxExtent, ...hhea } = newFont.tables.hhea;
    const { numberOfHMetrics: n, advanceWidthMax: a, minLeftSideBearing: l, minRightSideBearing: r, xMaxExtent: x, ...oldHhea } = oldFont.tables.hhea;
    expect(hhea).toEqual(oldHhea);
    expect(numberOfHMetrics).toBe(count + added.length);
    expect(advanceWidthMax).toBeGreaterThanOrEqual(a);
    const { usFirstCharIndex, usLastCharIndex, ...os2 } = newFont.tables.os2;
    const { usFirstCharIndex: first, usLastCharIndex: last, ...oldOs2 } = oldFont.tables.os2;
    expect(os2).toEqual(oldOs2);
    expect(usFirstCharIndex).toBeLessThanOrEqual(first);
    expect(usLastCharIndex).toBeGreaterThanOrEqual(last);
    expect(newFont.tables.gsub).toEqual(oldFont.tables.gsub);
    expect(newFont.numGlyphs).toBe(count + added.length);
    for (const tag of ['GSUB', 'name']) expect(table(next, tag).equals(table(base, tag)), tag).toBe(true);
    expect([...readTables(next).keys()].sort()).toEqual([...readTables(base).keys()].sort());
  });

  test('the old glyf bytes are a prefix of the new glyf table, and so is every old glyph record', () => {
    expect(table(next, 'glyf').subarray(0, table(base, 'glyf').length).equals(table(base, 'glyf'))).toBe(true);
    for (let gid = 0; gid < count; gid++) {
      expect(newGlyphs[gid].data.equals(oldGlyphs[gid].data), `glyph ${gid}`).toBe(true);
      expect(newGlyphs[gid].advance).toBe(oldGlyphs[gid].advance);
    }
  });

  test('head and maxp bounds cover every glyph, and loca is monotonic', () => {
    const head = table(next, 'head');
    const maxp = table(next, 'maxp');
    let points = 0;
    let contours = 0;
    let box = [Infinity, Infinity, -Infinity, -Infinity];
    for (const { data } of newGlyphs) {
      if (!data.length) continue;
      contours = Math.max(contours, data.readInt16BE(0));
      points = Math.max(points, data.readUInt16BE(10 + (data.readInt16BE(0) - 1) * 2) + 1);
      box = [Math.min(box[0], data.readInt16BE(2)), Math.min(box[1], data.readInt16BE(4)), Math.max(box[2], data.readInt16BE(6)), Math.max(box[3], data.readInt16BE(8))];
    }
    expect([head.readInt16BE(36), head.readInt16BE(38), head.readInt16BE(40), head.readInt16BE(42)]).toEqual(box);
    expect(maxp.readUInt16BE(6)).toBeGreaterThanOrEqual(points);
    expect(maxp.readUInt16BE(8)).toBeGreaterThanOrEqual(contours);
    const loca = table(next, 'loca');
    const long = head.readInt16BE(50) === 1;
    const offsets = Array.from({ length: newGlyphs.length + 1 }, (_, i) => (long ? loca.readUInt32BE(i * 4) : loca.readUInt16BE(i * 2) * 2));
    expect(offsets.every((o, i) => i === 0 || o >= offsets[i - 1])).toBe(true);
    expect(offsets.at(-1)).toBe(table(next, 'glyf').length);
  });

  test('every table checksum and the font checksum are valid', () => {
    const sum = (buf) => {
      let total = 0;
      for (let i = 0; i < buf.length; i += 4) total = (total + Buffer.concat([buf.subarray(i, i + 4), Buffer.alloc(4)]).readUInt32BE(0)) >>> 0;
      return total;
    };
    const count = next.readUInt16BE(4);
    for (let i = 0; i < count; i++) {
      const tag = next.toString('latin1', 12 + i * 16, 16 + i * 16);
      const body = Buffer.from(table(next, tag));
      if (tag === 'head') body.writeUInt32BE(0, 8);
      expect(next.readUInt32BE(16 + i * 16), tag).toBe(sum(body));
    }
    // The 1.3.0 regular font was never adjusted; the rebuilt ones are.
    if (added.length) expect(sum(next)).toBe(0xb1b0afba);
  });

  test('the added icons are in the font, with names and outlines of a fresh drawing of svg/', async () => {
    const fresh = parse(await drawFont(root, additions));
    for (const icon of added) {
      const gid = newFont.charToGlyphIndex(String.fromCodePoint(cp(icon.codepoint)));
      expect(gid, icon.base).toBeGreaterThanOrEqual(count);
      const glyph = newFont.glyphs.get(gid);
      expect(glyph.name).toBe(icon.base);
      expect(glyph.path.commands.length).toBeGreaterThan(2);
      const drawn = fresh.glyphs.get(fresh.charToGlyphIndex(String.fromCodePoint(cp(icon.codepoint))));
      expect(outline(glyph), icon.base).toBe(outline(drawn));
      expect(glyph.advanceWidth).toBe(drawn.advanceWidth);
    }
  });

  test('the added glyphs look like their svg files', () => {
    for (const icon of added) {
      const glyph = newFont.glyphs.get(newFont.charToGlyphIndex(String.fromCodePoint(cp(icon.codepoint))));
      const fromFont = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024"><path d="${glyph.getPath(0, newFont.ascender, 1024).toPathData(2)}"/></svg>`;
      const original = read(`svg/${icon.file}`).toString().replace(/<svg\b[^>]*>/, (tag) => tag.replace(/\s(width|height)="[^"]*"/g, ''));
      const [a, b] = [fromFont, original].map((svg) => new Resvg(svg, { fitTo: { mode: 'width', value: 128 } }).render().pixels);
      let inter = 0;
      let union = 0;
      for (let i = 3; i < a.length; i += 4) {
        inter += Math.min(a[i], b[i]);
        union += Math.max(a[i], b[i]);
      }
      // Both are the same outlines; only rounding to the 1024-unit grid moves the edges.
      expect(inter / union, icon.base).toBeGreaterThan(0.97);
    }
  });

  test.each(['woff', 'woff2'])('%s unpacks to the same tables as the ttf', async (ext) => {
    const packed = read(`${FONTS_DIR}/${name}.${ext}`);
    const unpacked = ext === 'woff2' ? Buffer.from(await wawoff2.decompress(packed)) : null;
    const tables = unpacked ? readTables2(unpacked) : unwoff(packed);
    const wanted = readTables(next);
    expect([...tables.keys()].sort()).toEqual([...wanted.keys()].sort());
    for (const tag of wanted.keys()) {
      // WOFF2 sets bit 11 of head.flags ("font data transformed") and may recompute checksumAdjustment.
      const [got, want] = [tag === 'head' && ext === 'woff2' ? maskHead(tables.get(tag)) : tables.get(tag), tag === 'head' && ext === 'woff2' ? maskHead(table(next, tag)) : table(next, tag)];
      expect(got.equals(want), `${ext} ${tag}`).toBe(true);
    }
    const font = parse(unpacked ?? Buffer.from(packed)); // opentype.js reads WOFF, not WOFF2
    expect(font.numGlyphs).toBe(count + added.length);
    for (const icon of added) expect(font.charToGlyphIndex(String.fromCodePoint(cp(icon.codepoint)))).toBeGreaterThanOrEqual(count);
  });
});

test('a font without added icons is the 1.3.0 file', () => {
  for (const [style, name] of Object.entries(FONT_OF_STYLE)) {
    if (additions.some((icon) => icon.style === style)) continue;
    expect(read(`${FONTS_DIR}/${name}.ttf`).equals(read(`${SOURCE_DIR}/${name}.ttf`)), name).toBe(true);
  }
});

function maskHead(head) {
  const copy = Buffer.from(head);
  copy.fill(0, 8, 12);
  copy.fill(0, 16, 18);
  return copy;
}

function readTables2(ttf) {
  return new Map([...readTables(ttf)].map(([tag]) => [tag, Buffer.from(table(ttf, tag))]));
}
