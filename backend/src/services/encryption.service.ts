import { randomBytes, createCipheriv, createDecipheriv } from 'crypto';

const ALGORITHM = 'aes-256-cbc';
const ENCODING = 'hex';
const IV_LENGTH = 16; // AES block size

export class EncryptionService {
    private static getKey(): Buffer {
        const key = process.env.ENCRYPTION_KEY;
        if (!key) {
            throw new Error("ENCRYPTION_KEY is not defined in environment variables. Must be 32 bytes (64 hex chars).");
        }
        // If the key is hex string, convert to buffer.
        // We assume the user provides a 64-char hex string (32 bytes) or a 32-char raw string?
        // Let's standardise on 64-char hex string for clarity, or just Buffer.from(key, 'hex').
        // If the user generates with openssl rand -hex 32, it will be 64 chars.
        if (key.length === 64) {
            return Buffer.from(key, 'hex');
        }
        // Fallback for 32-char raw string (less secure usually, but possible)
        if (key.length === 32) {
            return Buffer.from(key);
        }
        throw new Error("ENCRYPTION_KEY must be a 64-character hex string (32 bytes).");
    }

    /**
     * Encrypts a plaintext string.
     * Returns format: iv:encryptedData
     */
    static encrypt(text: string): string {
        const key = this.getKey();
        const iv = randomBytes(IV_LENGTH);
        const cipher = createCipheriv(ALGORITHM, key, iv);
        let encrypted = cipher.update(text);
        encrypted = Buffer.concat([encrypted, cipher.final()]);
        return iv.toString(ENCODING) + ':' + encrypted.toString(ENCODING);
    }

    /**
     * Decrypts a string in format iv:encryptedData
     */
    static decrypt(text: string): string {
        const key = this.getKey();
        const parts = text.split(':');
        if (parts.length !== 2) {
            throw new Error("Invalid encrypted text format.");
        }

        const iv = Buffer.from(parts[0], ENCODING);
        const encryptedText = Buffer.from(parts[1], ENCODING);

        // Validation
        if (iv.length !== IV_LENGTH) {
            throw new Error("Invalid IV length.");
        }

        const decipher = createDecipheriv(ALGORITHM, key, iv);
        let decrypted = decipher.update(encryptedText);
        decrypted = Buffer.concat([decrypted, decipher.final()]);

        return decrypted.toString();
    }
}
