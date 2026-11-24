// Token and password helpers of the mock backend. The real backend does the same with a proper
// password hash (bcrypt or argon2) and a random token of 32 bytes.

/** SHA-256 of a text, as hex. */
export async function sha256Hex(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** A random token for a link: 32 random bytes, URL-safe. Only its hash is stored. */
export function randomToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function hashPassword(salt: string, password: string): Promise<string> {
  return sha256Hex(`${salt}:${password}`);
}
