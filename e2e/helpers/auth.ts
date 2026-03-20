import fs from 'node:fs';
import path from 'node:path';

export function getExternalStorageStatePath(
  envValue = process.env.PLAYWRIGHT_STORAGE_STATE,
): string | null {
  const trimmed = envValue?.trim();
  return trimmed ? path.resolve(trimmed) : null;
}

export function hasExternalStorageState(
  envValue = process.env.PLAYWRIGHT_STORAGE_STATE,
): boolean {
  const resolvedPath = getExternalStorageStatePath(envValue);
  return Boolean(resolvedPath && fs.existsSync(resolvedPath));
}

export function getOptionalStorageState(
  envValue = process.env.PLAYWRIGHT_STORAGE_STATE,
): string | undefined {
  const resolvedPath = getExternalStorageStatePath(envValue);
  return resolvedPath && fs.existsSync(resolvedPath) ? resolvedPath : undefined;
}
