// Appends glyphs to an existing TrueType font without touching the glyphs it already has.
//
// The 1.3.0 fonts are what sites with unversioned CDN URLs run on. Rebuilding them from svg/ would
// redraw every icon, so new glyphs are copied in as raw `glyf` entries after the last old one:
// every old glyph keeps its bytes, its id and its codepoint. Only the tables that list glyphs
// change (loca, hmtx, cmap, post) plus counters and bounding boxes (maxp, hhea, head, OS/2).
import { Buffer } from 'node:buffer';

export function readTables(buf) {
  const count = buf.readUInt16BE(4);
  const tables = new Map();
  for (let i = 0; i < count; i++) {
    const at = 12 + i * 16;
    tables.set(buf.toString('latin1', at, at + 4), { offset: buf.readUInt32BE(at + 8), length: buf.readUInt32BE(at + 12) });
  }
  return tables;
}

const slice = (buf, table) => buf.subarray(table.offset, table.offset + table.length);

// codepoint -> glyph id from a Unicode subtable: the one asked for, else the Windows one
// (format 12 preferred, else format 4).
export function readCmap(buf, platformId, encodingId) {
  const cmap = slice(buf, readTables(buf).get('cmap'));
  const subtables = [];
  for (let i = 0; i < cmap.readUInt16BE(2); i++) {
    subtables.push({
      platform: cmap.readUInt16BE(4 + i * 8),
      encoding: cmap.readUInt16BE(6 + i * 8),
      offset: cmap.readUInt32BE(8 + i * 8),
    });
  }
  const pick =
    subtables.find((s) => s.platform === platformId && s.encoding === encodingId) ??
    subtables.find((s) => s.platform === 3 && s.encoding === 10) ??
    subtables.find((s) => s.platform === 3 && s.encoding === 1);
  const map = new Map();
  const at = pick.offset;
  const format = cmap.readUInt16BE(at);
  if (format === 12) {
    for (let g = 0; g < cmap.readUInt32BE(at + 12); g++) {
      const group = at + 16 + g * 12;
      const start = cmap.readUInt32BE(group);
      const end = cmap.readUInt32BE(group + 4);
      const first = cmap.readUInt32BE(group + 8);
      for (let cp = start; cp <= end; cp++) map.set(cp, first + cp - start);
    }
  } else if (format === 4) {
    const segments = cmap.readUInt16BE(at + 6) / 2;
    const ends = at + 14;
    const starts = ends + segments * 2 + 2;
    const deltas = starts + segments * 2;
    const ranges = deltas + segments * 2;
    for (let s = 0; s < segments; s++) {
      const end = cmap.readUInt16BE(ends + s * 2);
      const start = cmap.readUInt16BE(starts + s * 2);
      const delta = cmap.readInt16BE(deltas + s * 2);
      const range = cmap.readUInt16BE(ranges + s * 2);
      for (let cp = start; cp <= end && cp !== 0xffff; cp++) {
        let gid;
        if (range === 0) gid = (cp + delta) & 0xffff;
        else {
          gid = cmap.readUInt16BE(ranges + s * 2 + range + (cp - start) * 2);
          if (gid) gid = (gid + delta) & 0xffff;
        }
        if (gid) map.set(cp, gid);
      }
    }
  } else {
    throw new Error(`cmap format ${format} is not supported`);
  }
  return map;
}

// Raw glyphs of a font, indexed by glyph id: { data, advance }.
export function readGlyphs(buf) {
  const tables = readTables(buf);
  const long = slice(buf, tables.get('head')).readInt16BE(50) === 1;
  const loca = slice(buf, tables.get('loca'));
  const glyf = slice(buf, tables.get('glyf'));
  const hmtx = slice(buf, tables.get('hmtx'));
  const metrics = slice(buf, tables.get('hhea')).readUInt16BE(34);
  const count = slice(buf, tables.get('maxp')).readUInt16BE(4);
  const glyphs = [];
  for (let gid = 0; gid < count; gid++) {
    const start = long ? loca.readUInt32BE(gid * 4) : loca.readUInt16BE(gid * 2) * 2;
    const end = long ? loca.readUInt32BE(gid * 4 + 4) : loca.readUInt16BE(gid * 2 + 2) * 2;
    glyphs.push({ data: glyf.subarray(start, end), advance: hmtx.readUInt16BE(Math.min(gid, metrics - 1) * 4) });
  }
  return glyphs;
}

function glyphBox(data) {
  if (data.length === 0) return null;
  const contours = data.readInt16BE(0);
  if (contours < 0) throw new Error('composite glyphs are not supported');
  return {
    xMin: data.readInt16BE(2),
    yMin: data.readInt16BE(4),
    xMax: data.readInt16BE(6),
    yMax: data.readInt16BE(8),
    contours,
    points: contours ? data.readUInt16BE(10 + (contours - 1) * 2) + 1 : 0,
  };
}

const pad4 = (buf) => Buffer.concat([buf, Buffer.alloc((4 - (buf.length % 4)) % 4)]);

function runs(map) {
  const out = [];
  for (const cp of [...map.keys()].sort((a, b) => a - b)) {
    const gid = map.get(cp);
    const last = out[out.length - 1];
    if (last && cp === last.end + 1 && gid === last.gid + (cp - last.start)) last.end = cp;
    else out.push({ start: cp, end: cp, gid });
  }
  return out;
}

function cmapFormat12(map) {
  const groups = runs(map);
  const out = Buffer.alloc(16 + groups.length * 12);
  out.writeUInt16BE(12, 0);
  out.writeUInt32BE(out.length, 4);
  out.writeUInt32BE(groups.length, 12);
  groups.forEach((g, i) => {
    out.writeUInt32BE(g.start, 16 + i * 12);
    out.writeUInt32BE(g.end, 20 + i * 12);
    out.writeUInt32BE(g.gid, 24 + i * 12);
  });
  return out;
}

// Segments are runs of consecutive codepoints. A run whose glyph ids also count up is stored as an
// idDelta; any other run lists its glyph ids in glyphIdArray, which keeps the table small for fonts
// whose glyph order does not follow the codepoints.
function cmapFormat4(map) {
  const bmp = [...map].filter(([cp]) => cp < 0xffff).sort((a, b) => a[0] - b[0]);
  const segments = [];
  for (const [cp, gid] of bmp) {
    const last = segments[segments.length - 1];
    if (last && cp === last.end + 1) {
      last.end = cp;
      last.gids.push(gid);
    } else segments.push({ start: cp, end: cp, gids: [gid] });
  }
  segments.push({ start: 0xffff, end: 0xffff, gids: [0] });
  const n = segments.length;
  let arrayLength = 0;
  for (const s of segments) {
    s.sequential = s.gids.every((gid, i) => gid === s.gids[0] + i);
    s.arrayAt = arrayLength;
    if (!s.sequential) arrayLength += s.gids.length;
  }
  const out = Buffer.alloc(16 + n * 8 + arrayLength * 2);
  out.writeUInt16BE(4, 0);
  out.writeUInt16BE(out.length, 2);
  out.writeUInt16BE(n * 2, 6);
  const log = Math.floor(Math.log2(n));
  out.writeUInt16BE(2 * 2 ** log, 8);
  out.writeUInt16BE(log, 10);
  out.writeUInt16BE(n * 2 - 2 * 2 ** log, 12);
  const glyphArray = 16 + n * 8;
  segments.forEach((s, i) => {
    out.writeUInt16BE(s.end, 14 + i * 2);
    out.writeUInt16BE(s.start, 16 + n * 2 + i * 2);
    const rangeAt = 16 + n * 6 + i * 2;
    if (s.sequential) {
      out.writeUInt16BE((s.gids[0] - s.start) & 0xffff, 16 + n * 4 + i * 2);
    } else {
      // idDelta stays 0; the offset is counted from the idRangeOffset entry itself.
      out.writeUInt16BE(glyphArray + s.arrayAt * 2 - rangeAt, rangeAt);
      s.gids.forEach((gid, k) => out.writeUInt16BE(gid, glyphArray + (s.arrayAt + k) * 2));
    }
  });
  return out;
}

function buildCmap(oldCmap, map) {
  const subtables = [];
  for (let i = 0; i < oldCmap.readUInt16BE(2); i++) {
    const platform = oldCmap.readUInt16BE(4 + i * 8);
    const encoding = oldCmap.readUInt16BE(6 + i * 8);
    const at = oldCmap.readUInt32BE(8 + i * 8);
    const format = oldCmap.readUInt16BE(at);
    let data;
    if (format === 4) data = cmapFormat4(map);
    else if (format === 12) data = cmapFormat12(map);
    else if (format === 0) data = oldCmap.subarray(at, at + oldCmap.readUInt16BE(at + 2)); // Mac Roman: letters only
    else throw new Error(`cmap format ${format} is not supported`);
    subtables.push({ platform, encoding, data: pad4(data) });
  }
  // Subtables with the same bytes are stored once, as in the 1.3.0 fonts.
  const header = Buffer.alloc(4 + subtables.length * 8);
  header.writeUInt16BE(subtables.length, 2);
  const stored = [];
  let offset = header.length;
  subtables.forEach((s, i) => {
    let same = stored.find((o) => o.data.equals(s.data));
    if (!same) {
      same = { data: s.data, offset };
      stored.push(same);
      offset += s.data.length;
    }
    header.writeUInt16BE(s.platform, 4 + i * 8);
    header.writeUInt16BE(s.encoding, 6 + i * 8);
    header.writeUInt32BE(same.offset, 8 + i * 8);
  });
  return Buffer.concat([header, ...stored.map((s) => s.data)]);
}

// post format 2 keeps a name per glyph: the old names stay, new ones are appended.
function buildPost(oldPost, names) {
  if (oldPost.readUInt32BE(0) !== 0x00020000) return oldPost;
  const count = oldPost.readUInt16BE(32);
  const indexEnd = 34 + count * 2;
  // Names are numbered 258 and up in the order of their strings; the highest index in use says how many
  // strings the table really has (the data may carry padding after the last one).
  let custom = 0;
  for (let i = 0; i < count; i++) custom = Math.max(custom, oldPost.readUInt16BE(34 + i * 2) - 257);
  const taken = new Set();
  let end = indexEnd;
  for (let n = 0; n < custom; n++) {
    const len = oldPost[end];
    taken.add(oldPost.toString('latin1', end + 1, end + 1 + len));
    end += 1 + len;
  }
  const indexes = Buffer.alloc(names.length * 2);
  const strings = [];
  names.forEach((name, i) => {
    let unique = name;
    while (taken.has(unique)) unique += '-added';
    taken.add(unique);
    indexes.writeUInt16BE(258 + custom + i, i * 2);
    strings.push(Buffer.from([unique.length]), Buffer.from(unique, 'latin1'));
  });
  const head = Buffer.from(oldPost.subarray(0, 34));
  head.writeUInt16BE(count + names.length, 32);
  return Buffer.concat([head, oldPost.subarray(34, indexEnd), indexes, oldPost.subarray(indexEnd, end), ...strings]);
}

function checksum(buf) {
  let sum = 0;
  const padded = pad4(buf);
  for (let i = 0; i < padded.length; i += 4) sum = (sum + padded.readUInt32BE(i)) >>> 0;
  return sum;
}

// base: a TrueType font. added: [{ codepoint, name, glyph: { data, advance } }] in glyph order.
export function appendGlyphs(base, added) {
  const tables = readTables(base);
  const get = (tag) => Buffer.from(slice(base, tables.get(tag)));
  const first = get('maxp').readUInt16BE(4);
  const oldMap = readCmap(base);

  const head = get('head');
  const oldLong = head.readInt16BE(50) === 1;
  const oldLoca = get('loca');
  const offsets = [];
  for (let i = 0; i <= first; i++) offsets.push(oldLong ? oldLoca.readUInt32BE(i * 4) : oldLoca.readUInt16BE(i * 2) * 2);
  const oldGlyf = get('glyf');
  // The old glyf table is kept byte for byte; new glyphs go after it.
  const glyf = Buffer.concat([oldGlyf, ...added.map((a) => pad4(a.glyph.data))]);
  let cursor = offsets[first];
  for (const a of added) {
    cursor += pad4(a.glyph.data).length;
    offsets.push(cursor);
  }
  const long = oldLong || cursor > 0x1fffe;
  const loca = Buffer.alloc(offsets.length * (long ? 4 : 2));
  offsets.forEach((o, i) => (long ? loca.writeUInt32BE(o, i * 4) : loca.writeUInt16BE(o / 2, i * 2)));
  head.writeInt16BE(long ? 1 : 0, 50);

  // Every old glyph already has a long metric, so new ones just follow.
  const hhea = get('hhea');
  if (hhea.readUInt16BE(34) !== first) throw new Error('hmtx with short metrics is not supported');
  const hmtx = Buffer.concat([get('hmtx'), ...added.map((a) => {
    const entry = Buffer.alloc(4);
    entry.writeUInt16BE(a.glyph.advance, 0);
    entry.writeInt16BE(glyphBox(a.glyph.data)?.xMin ?? 0, 2);
    return entry;
  })]);
  hhea.writeUInt16BE(first + added.length, 34);

  const maxp = get('maxp');
  maxp.writeUInt16BE(first + added.length, 4);
  for (const a of added) {
    hhea.writeUInt16BE(Math.max(hhea.readUInt16BE(10), a.glyph.advance), 10); // advanceWidthMax
    const box = glyphBox(a.glyph.data);
    if (!box) continue;
    maxp.writeUInt16BE(Math.max(maxp.readUInt16BE(6), box.points), 6);
    maxp.writeUInt16BE(Math.max(maxp.readUInt16BE(8), box.contours), 8);
    head.writeInt16BE(Math.min(head.readInt16BE(36), box.xMin), 36);
    head.writeInt16BE(Math.min(head.readInt16BE(38), box.yMin), 38);
    head.writeInt16BE(Math.max(head.readInt16BE(40), box.xMax), 40);
    head.writeInt16BE(Math.max(head.readInt16BE(42), box.yMax), 42);
  }

  const map = new Map(oldMap);
  added.forEach((a, i) => {
    if (map.has(a.codepoint)) throw new Error(`U+${a.codepoint.toString(16)} is already in the font`);
    map.set(a.codepoint, first + i);
  });
  const os2 = get('OS/2');
  const bmp = [...map.keys()].filter((cp) => cp <= 0xffff);
  os2.writeUInt16BE(Math.min(...bmp), 64);
  os2.writeUInt16BE(Math.max(...bmp), 66);

  const out = new Map([...tables.keys()].map((tag) => [tag, get(tag)]));
  out.set('glyf', glyf);
  out.set('loca', loca);
  out.set('hmtx', hmtx);
  out.set('hhea', hhea);
  out.set('maxp', maxp);
  out.set('head', head);
  out.set('OS/2', os2);
  out.set('cmap', buildCmap(get('cmap'), map));
  out.set('post', buildPost(get('post'), added.map((a) => a.name)));

  const tags = [...out.keys()].sort();
  head.writeUInt32BE(0, 8);
  const directory = Buffer.alloc(12 + tags.length * 16);
  base.copy(directory, 0, 0, 4);
  directory.writeUInt16BE(tags.length, 4);
  const log = Math.floor(Math.log2(tags.length));
  directory.writeUInt16BE(16 * 2 ** log, 6);
  directory.writeUInt16BE(log, 8);
  directory.writeUInt16BE(tags.length * 16 - 16 * 2 ** log, 10);
  let offset = directory.length;
  const bodies = [];
  tags.forEach((tag, i) => {
    const body = out.get(tag);
    const at = 12 + i * 16;
    directory.write(tag, at, 'latin1');
    directory.writeUInt32BE(checksum(body), at + 4);
    directory.writeUInt32BE(offset, at + 8);
    directory.writeUInt32BE(body.length, at + 12);
    const padded = pad4(body);
    bodies.push(padded);
    offset += padded.length;
  });
  const font = Buffer.concat([directory, ...bodies]);
  const headAt = directory.length + bodies.slice(0, tags.indexOf('head')).reduce((n, b) => n + b.length, 0);
  font.writeUInt32BE((0xb1b0afba - checksum(font)) >>> 0, headAt + 8);
  return font;
}
