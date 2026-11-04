import {createHash, randomBytes, timingSafeEqual} from 'node:crypto';

const JWT_SECRET = process.env.WESTOS_JWT_SECRET ?? 'westos-dev-secret-change-in-production';
const JWT_EXPIRY_SECONDS = 60 * 60 * 24 * 7; // 7 days

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = createHash('sha256').update(password + salt).digest('hex');
  return `${salt}:${hash}`;
}

export function comparePassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const computed = createHash('sha256').update(password + salt).digest('hex');
  return timingSafeEqual(Buffer.from(hash), Buffer.from(computed));
}

export function signToken(payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({alg: 'HS256', typ: 'JWT'})).toString('base64url');
  const body = Buffer.from(JSON.stringify({...payload, exp: Math.floor(Date.now() / 1000) + JWT_EXPIRY_SECONDS})).toString('base64url');
  const sig = createHash('sha256').update(`${header}.${body}.${JWT_SECRET}`).digest('base64url');
  return `${header}.${body}.${sig}`;
}

export function verifyToken(token: string): Record<string, unknown> | null {
  try {
    const [header, body, sig] = token.split('.');
    if (!header || !body || !sig) return null;
    const expected = createHash('sha256').update(`${header}.${body}.${JWT_SECRET}`).digest('base64url');
    if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf-8'));
    if (payload.exp && Date.now() > payload.exp * 1000) return null;
    return payload as Record<string, unknown>;
  } catch { return null; }
}

export function generateId(prefix: string): string {
  return `${prefix}_${randomBytes(16).toString('hex')}`;
}

export function generateReference(prefix: string): string {
  return `${prefix}_${randomBytes(8).toString('uppercase')}`;
}

export type CustomerIdentity = {customerId: string; email: string; name: string};
export function getCustomerIdentity(request: Request): CustomerIdentity | null {
  const auth = request.headers.get('authorization');
  if (!auth) return null;
  const match = /^Bearer (.+)$/i.exec(auth);
  if (!match) return null;
  const payload = verifyToken(match[1]);
  if (!payload || !payload.customerId || !payload.email) return null;
  return {customerId: String(payload.customerId), email: String(payload.email), name: String(payload.name ?? '')};
}
