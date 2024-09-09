import * as crypto from 'node:crypto';
import { Readable, Writable } from 'node:stream';
import { AppendStream } from '../util';

export interface EncryptionStrategyInterface {
	createEncryption(): { iv: Buffer; cipher: crypto.CipherGCM };
	createDecryption(iv: Buffer, authTag: Buffer): crypto.DecipherGCM;

	getEncryptionVitals(
		fileStream: Readable,
	): Promise<{ authTag: Buffer; iv: Buffer; encryptionTag: string }>;

	appendEncryptionVitals(
		stream: Writable,
		authTag: Buffer,
		iv: Buffer,
	): Promise<void>;

	isEncrypted(encryptionTag: string): boolean;
	encryptionVitalsStart(fileSize: number): number;
	encryptedFileEnd(fileSize: number): number;
}
