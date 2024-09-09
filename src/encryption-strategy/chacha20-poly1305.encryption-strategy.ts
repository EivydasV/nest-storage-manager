import * as crypto from 'node:crypto';
import { Readable, Writable } from 'node:stream';
import { finished } from 'node:stream/promises';
import { Injectable } from '@nestjs/common';
import { AppendStream } from '../util';
import { AbstractEncryptionStrategy } from './abstract.encryption-strategy';

@Injectable()
export class Chacha20Poly1305EncryptionStrategy extends AbstractEncryptionStrategy {
	protected readonly ALGORITHM =
		'chacha20-poly1305' satisfies crypto.CipherCCMTypes;
	protected readonly AUTH_TAG_LENGTH = 16;
	protected readonly IV_LENGTH = 12;

	createEncryption(): { iv: Buffer; cipher: crypto.CipherGCM } {
		const iv = crypto.randomBytes(this.IV_LENGTH);
		const cipher = crypto.createCipheriv(this.ALGORITHM, this.key, iv, {
			authTagLength: this.AUTH_TAG_LENGTH,
		});

		return {
			iv,
			cipher,
		};
	}

	public async appendEncryptionVitals(
		stream: Writable,
		authTag: Buffer,
		iv: Buffer,
	): Promise<void> {
		const buffer = Buffer.concat([authTag, iv, this.encryptionTag]);
		stream.write(buffer);
		stream.end();

		await finished(stream);
	}

	public async getEncryptionVitals(
		fileStream: Readable,
	): Promise<{ authTag: Buffer; iv: Buffer; encryptionTag: string }> {
		let encryptionVitals: Buffer = Buffer.alloc(0);
		fileStream.on('data', (chunk) => {
			encryptionVitals = chunk as Buffer;
		});

		await finished(fileStream);

		const autTag = encryptionVitals.subarray(0, this.AUTH_TAG_LENGTH);
		const iv = encryptionVitals.subarray(
			this.AUTH_TAG_LENGTH,
			this.AUTH_TAG_LENGTH + this.IV_LENGTH,
		);

		const encryptionTag = encryptionVitals.subarray(
			this.AUTH_TAG_LENGTH + this.IV_LENGTH,
			this.AUTH_TAG_LENGTH + this.IV_LENGTH + this.encryptionTag.byteLength,
		);

		return {
			authTag: autTag,
			iv: iv,
			encryptionTag: encryptionTag.toString('utf-8'),
		};
	}

	public createDecryption(iv: Buffer, authTag: Buffer): crypto.DecipherGCM {
		const decipher = crypto.createDecipheriv(this.ALGORITHM, this.key, iv, {
			authTagLength: this.AUTH_TAG_LENGTH,
		});
		decipher.setAuthTag(authTag);

		return decipher;
	}

	public encryptionVitalsStart(fileSize: number): number {
		const sum =
			this.IV_LENGTH + this.AUTH_TAG_LENGTH + this.encryptionTag.byteLength;

		return Math.max(0, fileSize - sum);
	}

	public encryptedFileEnd(fileSize: number): number {
		const sum =
			this.IV_LENGTH + this.AUTH_TAG_LENGTH + this.encryptionTag.byteLength + 1;

		return fileSize - sum;
	}
}
