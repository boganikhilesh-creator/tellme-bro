import crypto from 'crypto';

/**
 * Hashes a plaintext password using Argon2id with memory-hard parameters,
 * with automatic fallback to Node's built-in crypto.scrypt on Linux environments
 * with older GLIBC versions (e.g. CentOS/CloudLinux).
 */
export async function hashPassword(password: string): Promise<string> {
  try {
    const argon2 = await import('argon2');
    return await argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 2 ** 16,
      timeCost: 3,
      parallelism: 1,
    });
  } catch (err) {
    // Fallback to built-in crypto.scrypt (Zero external glibc dependencies)
    return new Promise((resolve, reject) => {
      const salt = crypto.randomBytes(16).toString('hex');
      crypto.scrypt(password, salt, 64, (scryptErr, derivedKey) => {
        if (scryptErr) return reject(scryptErr);
        resolve(`$scrypt$${salt}$${derivedKey.toString('hex')}`);
      });
    });
  }
}

/**
 * Verifies a plaintext password against an Argon2id or scrypt hash.
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  try {
    if (!hash || typeof hash !== 'string') return false;

    // Handle scrypt fallback hashes
    if (hash.startsWith('$scrypt$')) {
      const parts = hash.split('$');
      const salt = parts[2];
      const keyHex = parts[3];
      if (!salt || !keyHex) return false;

      return new Promise((resolve) => {
        crypto.scrypt(password, salt, 64, (err, derivedKey) => {
          if (err) return resolve(false);
          const expectedKey = Buffer.from(keyHex, 'hex');
          if (expectedKey.length !== derivedKey.length) return resolve(false);
          resolve(crypto.timingSafeEqual(expectedKey, derivedKey));
        });
      });
    }

    // Default: Argon2id verification
    const argon2 = await import('argon2');
    return await argon2.verify(hash, password);
  } catch (err) {
    // If argon2 fails to load on CentOS 7, don't crash
    console.error('Password verification fallback failed:', err);
    return false;
  }
}
