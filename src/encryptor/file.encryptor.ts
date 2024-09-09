import * as crypto from 'node:crypto';

import { Readable, Writable } from 'node:stream';
import { EncryptionStrategyInterface } from '../interface';

export class FileEncryptor {
	private encryptionStrategy: EncryptionStrategyInterface;

	setStrategy(strategy: EncryptionStrategyInterface) {
		this.encryptionStrategy = strategy;
	}

	isEncryptionEnabled(): boolean {
		return Boolean(this.encryptionStrategy);
	}

	createEncryption(): { iv: Buffer; cipher: crypto.CipherGCM } {
		return this.encryptionStrategy.createEncryption();
	}

	createDecryption(iv: Buffer, authTag: Buffer): crypto.DecipherGCM {
		return this.encryptionStrategy.createDecryption(iv, authTag);
	}

	async appendEncryptionVitals(
		stream: Writable,
		authTag: Buffer,
		iv: Buffer,
	): Promise<void> {
		await this.encryptionStrategy.appendEncryptionVitals(stream, authTag, iv);
	}

	getEncryptionVitals(
		fileStream: Readable,
	): Promise<{ authTag: Buffer; iv: Buffer; encryptionTag: string }> {
		return this.encryptionStrategy.getEncryptionVitals(fileStream);
	}

	isEncrypted(encryptionTag: string): boolean {
		return this.encryptionStrategy.isEncrypted(encryptionTag);
	}

	encryptionVitalsStart(fileSize: number): number {
		return this.encryptionStrategy.encryptionVitalsStart(fileSize);
	}

	encryptedFileEnd(fileSize: number): number {
		return this.encryptionStrategy.encryptedFileEnd(fileSize);
	}
}
