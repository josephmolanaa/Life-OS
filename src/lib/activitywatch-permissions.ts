import { timingSafeEqual, randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export function isDesktopActivity() {
  return process.env.LIFE_OS_DESKTOP_ACTIVITY === '1';
}

export function trustedActivityRequest(request: Request) {
  const expected = process.env.LIFE_OS_ACTIVITY_SECRET;
  const actual = request.headers.get('x-lifeos-activity');
  if (!isDesktopActivity() || !expected || !actual) return false;
  const a = Buffer.from(actual);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

function permissionFile() {
  const file = process.env.LIFE_OS_ACTIVITY_PERMISSIONS;
  if (!file || !path.isAbsolute(file)) throw new Error('Permission storage unavailable');
  return file;
}

function readPermissions(): string[] {
  try {
    const raw = fs.readFileSync(permissionFile(), 'utf8');
    if (raw.length > 65536) throw new Error('Invalid permissions');
    const ids: unknown = JSON.parse(raw);
    if (!Array.isArray(ids) || ids.some(id => typeof id !== 'string' || !/^[a-zA-Z0-9-]{1,128}$/.test(id))) throw new Error('Invalid permissions');
    return ids;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw error;
  }
}

export function hasActivityPermission(userId: string) {
  return readPermissions().includes(userId);
}

// ponytail: one local Next server writes synchronously; use a transactional store for multiple writers.
export function setActivityPermission(userId: string, allowed: boolean) {
  if (!/^[a-zA-Z0-9-]{1,128}$/.test(userId)) throw new Error('Invalid account');
  const ids = new Set(readPermissions());
  if (allowed) ids.add(userId); else ids.delete(userId);
  const file = permissionFile();
  const temporary = `${file}.${randomUUID()}.tmp`;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  try {
    fs.writeFileSync(temporary, JSON.stringify([...ids]), { mode: 0o600, flag: 'wx' });
    fs.renameSync(temporary, file);
  } finally {
    fs.rmSync(temporary, { force: true });
  }
}
