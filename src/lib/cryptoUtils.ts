import crypto from 'crypto';

const HASH_ALGORITHM = 'sha512';
const KEY_LENGTH = 64; // 64 bytes = 512 bits
const ITERATIONS = 100000; // Adjust based on security needs and performance
const SALT_BYTES = 16; // 16 bytes = 128 bits

/**
 * Hashes a password using PBKDF2 with a random salt.
 * Returns a string in the format "salt:derivedKey".
 */
export async function pbkdf2Hash(password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(SALT_BYTES).toString('hex');

    crypto.pbkdf2(password, salt, ITERATIONS, KEY_LENGTH, HASH_ALGORITHM, (err, derivedKey) => {
      if (err) {
        console.error('Error hashing password:', err);
        reject(err);
      } else {
        resolve(`${salt}:${derivedKey.toString('hex')}`);
      }
    });
  });
}

/**
 * Verifies a password against a stored hash (format "salt:derivedKey").
 */
export async function pbkdf2Verify(storedHash: string, providedPassword: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const [salt, originalKeyHex] = storedHash.split(':');
    if (!salt || !originalKeyHex) {
        console.error("Invalid stored hash format.");
        return resolve(false); // Or reject? Resolve false is safer for auth flows.
    }

    crypto.pbkdf2(providedPassword, salt, ITERATIONS, KEY_LENGTH, HASH_ALGORITHM, (err, derivedKey) => {
      if (err) {
        console.error('Error verifying password:', err);
        reject(err); // Propagate error
      } else {
        const derivedKeyHex = derivedKey.toString('hex');
        // Use timingSafeEqual for security against timing attacks
        try {
            const isEqual = crypto.timingSafeEqual(Buffer.from(derivedKeyHex, 'hex'), Buffer.from(originalKeyHex, 'hex'));
            resolve(isEqual);
        } catch (timingError) {
             // This can happen if buffers have different lengths
             console.warn("Timing safe comparison failed (likely due to length mismatch):", timingError);
             resolve(false);
        }
      }
    });
  });
}


// Example usage (for testing or seeding, not for API routes)
// async function testHashing() {
//   const password = "mysecretpassword";
//   const hash = await pbkdf2Hash(password);
//   console.log("Generated Hash:", hash);

//   const isValid = await pbkdf2Verify(hash, password);
//   console.log("Password valid?", isValid); // Should be true

//   const isInvalid = await pbkdf2Verify(hash, "wrongpassword");
//   console.log("Password invalid?", isInvalid); // Should be false
// }

// testHashing();
