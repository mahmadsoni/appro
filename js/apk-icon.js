/* =========================================================================
   APK ICON EXTRACTOR
   An .apk file IS a .zip file. This module reads that zip structure
   directly in the browser (no server, no build step) and pulls out the
   app's real launcher icon — so nobody ever has to upload artwork.

   How it works:
   1. Fetch the raw .apk bytes.
   2. Find the ZIP "End Of Central Directory" record (scan from the end).
   3. Read the Central Directory to list every file inside the APK.
   4. Pick the best-looking launcher icon — tries standard ic_launcher.png
      names across every density folder first (PNG and WebP), then falls
      back to the largest image found in any mipmap/drawable folder for
      APKs that use unusual icon naming.
   5. Jump to that file's Local Header, extract its bytes, and decompress
      with the browser's native DecompressionStream if needed.
   6. Return a blob: URL the <img> tag can use directly.

   If anything about this fails (corrupt file, no icon found, browser
   without DecompressionStream support), it fails silently and the caller
   falls back to the generic gradient+glyph icon.
   ========================================================================= */

(function (global) {
  'use strict';

  const iconCache = new Map(); // apkUrl -> Promise<string|null> (object URL)

  const ICON_PATTERNS = [
    // Ordered by preference: highest-resolution launcher icon first.
    /mipmap-xxxhdpi[^/]*\/ic_launcher\.(png|webp)$/i,
    /mipmap-xxhdpi[^/]*\/ic_launcher\.(png|webp)$/i,
    /mipmap-xhdpi[^/]*\/ic_launcher\.(png|webp)$/i,
    /mipmap-hdpi[^/]*\/ic_launcher\.(png|webp)$/i,
    /mipmap-mdpi[^/]*\/ic_launcher\.(png|webp)$/i,
    /mipmap-xxxhdpi[^/]*\/ic_launcher_round\.(png|webp)$/i,
    /mipmap-xxhdpi[^/]*\/ic_launcher_round\.(png|webp)$/i,
    /mipmap-xhdpi[^/]*\/ic_launcher_round\.(png|webp)$/i,
    /drawable-xxxhdpi[^/]*\/ic_launcher\.(png|webp)$/i,
    /drawable-xxhdpi[^/]*\/ic_launcher\.(png|webp)$/i,
    /drawable-xhdpi[^/]*\/ic_launcher\.(png|webp)$/i,
    /drawable-hdpi[^/]*\/ic_launcher\.(png|webp)$/i,
    /drawable[^/]*\/ic_launcher\.(png|webp)$/i,
    // Broader "launcher" / "app_icon" / "logo" matches, any density folder.
    /(mipmap|drawable)[^/]*\/ic_launcher[^/]*\.(png|webp)$/i,
    /(mipmap|drawable)[^/]*\/(app_icon|appicon|logo|icon)\.(png|webp)$/i,
    /ic_launcher\.(png|webp)$/i,
    /(app_icon|appicon|logo)\.(png|webp)$/i,
  ];

  function readUint16(view, offset) { return view.getUint16(offset, true); }
  function readUint32(view, offset) { return view.getUint32(offset, true); }

  function extOf(name) {
    const m = name.match(/\.(png|webp)$/i);
    return m ? m[1].toLowerCase() : 'png';
  }

  function findEndOfCentralDirectory(buf) {
    const view = new DataView(buf);
    const SIG = 0x06054b50;
    // EOCD is near the end of the file; scan backwards within the last 64KB+22 bytes.
    const maxScan = Math.min(buf.byteLength, 65557);
    for (let i = buf.byteLength - 22; i >= buf.byteLength - maxScan; i--) {
      if (i < 0) break;
      if (readUint32(view, i) === SIG) return i;
    }
    return -1;
  }

  function parseCentralDirectory(buf) {
    const eocdOffset = findEndOfCentralDirectory(buf);
    if (eocdOffset < 0) return [];
    const view = new DataView(buf);
    const totalEntries = readUint16(view, eocdOffset + 10);
    let cdOffset = readUint32(view, eocdOffset + 16);
    const entries = [];
    const CD_SIG = 0x02014b50;

    for (let i = 0; i < totalEntries; i++) {
      if (readUint32(view, cdOffset) !== CD_SIG) break;
      const compressionMethod = readUint16(view, cdOffset + 10);
      const compressedSize = readUint32(view, cdOffset + 20);
      const uncompressedSize = readUint32(view, cdOffset + 24);
      const nameLen = readUint16(view, cdOffset + 28);
      const extraLen = readUint16(view, cdOffset + 30);
      const commentLen = readUint16(view, cdOffset + 32);
      const localHeaderOffset = readUint32(view, cdOffset + 42);
      const nameBytes = new Uint8Array(buf, cdOffset + 46, nameLen);
      const name = new TextDecoder('utf-8').decode(nameBytes);

      entries.push({ name, compressionMethod, compressedSize, uncompressedSize, localHeaderOffset });
      cdOffset += 46 + nameLen + extraLen + commentLen;
    }
    return entries;
  }

  function extractFileBytes(buf, entry) {
    const view = new DataView(buf);
    const LOCAL_SIG = 0x04034b50;
    const off = entry.localHeaderOffset;
    if (readUint32(view, off) !== LOCAL_SIG) return null;
    const nameLen = readUint16(view, off + 26);
    const extraLen = readUint16(view, off + 28);
    const dataStart = off + 30 + nameLen + extraLen;
    return new Uint8Array(buf, dataStart, entry.compressedSize);
  }

  async function decompress(bytes, method) {
    if (method === 0) return bytes; // stored, no compression
    if (method === 8 && typeof DecompressionStream !== 'undefined') {
      try {
        const ds = new DecompressionStream('deflate-raw');
        const stream = new Blob([bytes]).stream().pipeThrough(ds);
        const out = await new Response(stream).arrayBuffer();
        return new Uint8Array(out);
      } catch (e) { return null; }
    }
    return null; // unsupported compression method or no DecompressionStream
  }

  function pickBestIconEntry(entries) {
    for (const pattern of ICON_PATTERNS) {
      const match = entries.find(e => pattern.test(e.name));
      if (match) return match;
    }
    // Last resort: the largest image file inside any mipmap/drawable folder —
    // almost always the launcher icon even with unusual naming.
    const imageEntries = entries.filter(e => /(mipmap|drawable)[^/]*\/[^/]+\.(png|webp)$/i.test(e.name));
    if (imageEntries.length) {
      return imageEntries.reduce((a, b) => (b.uncompressedSize > a.uncompressedSize ? b : a));
    }
    return null;
  }

  /**
   * Extracts the real launcher icon from an .apk URL.
   * Returns a blob: object URL on success, or null if no icon could be found.
   * Results are cached per URL for the session.
   */
  function extract(apkUrl) {
    if (iconCache.has(apkUrl)) return iconCache.get(apkUrl);

    const promise = (async () => {
      try {
        const res = await fetch(apkUrl);
        if (!res.ok) return null;
        const buf = await res.arrayBuffer();
        const entries = parseCentralDirectory(buf);
        if (!entries.length) return null;
        const iconEntry = pickBestIconEntry(entries);
        if (!iconEntry) return null;
        const rawBytes = extractFileBytes(buf, iconEntry);
        if (!rawBytes) return null;
        const imgBytes = await decompress(rawBytes, iconEntry.compressionMethod);
        if (!imgBytes) return null;
        const mime = extOf(iconEntry.name) === 'webp' ? 'image/webp' : 'image/png';
        const blob = new Blob([imgBytes], { type: mime });
        return URL.createObjectURL(blob);
      } catch (e) {
        return null;
      }
    })();

    iconCache.set(apkUrl, promise);
    return promise;
  }

  /**
   * Gets the real byte size of a file (in MB) via a HEAD request —
   * so nobody has to type in a file size by hand either.
   */
  const sizeCache = new Map();
  function getSizeMb(fileUrl) {
    if (sizeCache.has(fileUrl)) return sizeCache.get(fileUrl);
    const promise = (async () => {
      try {
        const res = await fetch(fileUrl, { method: 'HEAD' });
        if (!res.ok) return null;
        const len = res.headers.get('content-length');
        if (!len) return null;
        return +(parseInt(len, 10) / (1024 * 1024)).toFixed(1);
      } catch (e) { return null; }
    })();
    sizeCache.set(fileUrl, promise);
    return promise;
  }

  global.APK_TOOLS = { extract, getSizeMb };
})(window);
