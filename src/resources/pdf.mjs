import { HARD_LIMIT } from "../../supabase/functions/_shared/validation.mjs";

// Fetch once while the signed link is fresh. Reading later pages then needs no
// additional signed requests, and no file bytes are persisted in browser storage.
export async function pdfBytes(getLink, expectedSize, signal, fetcher = fetch) {
  for (let attempt = 0; attempt < 2; attempt++) {
    const response = await fetcher(await getLink(), {
      signal,
      credentials: "same-origin",
      cache: "no-store",
    });
    if ((response.status === 401 || response.status === 403) && attempt === 0)
      continue;
    if (!response.ok)
      throw Error(
        "PDF could not be loaded. Retry for a fresh link, or download the original.",
      );
    if (Number(response.headers.get("content-length") || 0) > HARD_LIMIT)
      throw Error("PDF exceeds the preview size limit. Download the original.");
    const reader = response.body?.getReader();
    if (!reader)
      throw Error("PDF data is unavailable. Retry or download the original.");
    const chunks = [];
    let length = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.length;
      if (length > HARD_LIMIT) {
        await reader.cancel();
        throw Error(
          "PDF exceeds the preview size limit. Download the original.",
        );
      }
      chunks.push(value);
    }
    if (!length || (expectedSize && length !== expectedSize))
      throw Error(
        "PDF download was incomplete. Retry or download the original.",
      );
    const bytes = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.length;
    }
    if (new TextDecoder().decode(bytes.subarray(0, 5)) !== "%PDF-")
      throw Error(
        "This file could not be read as a PDF. Download the original to check it.",
      );
    return bytes;
  }
  throw Error("PDF link expired. Retry for a fresh link.");
}

export function pdfViewport(width, height, available, zoom, ratio = 1) {
  if (
    ![width, height, available, zoom, ratio].every(Number.isFinite) ||
    width <= 0 ||
    height <= 0
  )
    throw Error("Invalid PDF page dimensions.");
  const scale = Math.min(
    Math.max(0.01, (available - 24) / width) * zoom,
    10000 / width,
    20000 / height,
  );
  const cssWidth = Math.max(1, width * scale),
    cssHeight = Math.max(1, height * scale);
  const outputScale = Math.min(
    Math.max(1, ratio),
    2,
    Math.sqrt(8_000_000 / (cssWidth * cssHeight)),
  );
  return {
    scale,
    cssWidth,
    cssHeight,
    outputScale,
    pixelWidth: Math.max(1, Math.floor(cssWidth * outputScale)),
    pixelHeight: Math.max(1, Math.floor(cssHeight * outputScale)),
  };
}
