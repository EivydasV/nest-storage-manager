import * as crypto from 'node:crypto';
import { Readable, Writable } from 'node:stream';
import { EncryptionStrategyInterface } from '../interface';
import { AppendStream } from '../util';

export abstract class AbstractEncryptionStrategy
	implements EncryptionStrategyInterface
{
	protected readonly ALGORITHM: crypto.CipherCCMTypes;
	protected readonly AUTH_TAG_LENGTH: number;
	protected readonly IV_LENGTH: number;
	protected readonly key: Buffer = Buffer.from(
		'e61+IqVrPP3TjzYt0aAwRexrvngJaBeeYzNGzKoHR/M=',
		'base64',
	);

	protected get encryptionTag(): Buffer {
		return Buffer.from('ENCRYPTED');
	}

	public isEncrypted(encryptionTag: string): boolean {
		return encryptionTag === this.encryptionTag.toString('utf-8');
	}

	// public credentialsLengthStart(fileSize: number): number {
	// 	const sum = this.ivLength + this.authTagLength + this.encryptionTagLength;
	// 	return Math.max(0, fileSize - sum);
	// }
	//
	// public encryptedFileEnd(fileSize: number): number {
	// 	const sum =
	// 		this.ivLength + this.authTagLength + this.encryptionTagLength + 1;
	//
	// 	return fileSize - sum;
	// }

	public abstract appendEncryptionVitals(
		stream: Writable,
		authTag: Buffer,
		iv: Buffer,
	): Promise<void>;

	public abstract getEncryptionVitals(
		fileStream: Readable,
	): Promise<{ authTag: Buffer; iv: Buffer; encryptionTag: string }>;

	public abstract createDecryption(
		iv: Buffer,
		authTag: Buffer,
	): crypto.DecipherGCM;

	public abstract createEncryption(): {
		iv: Buffer;
		cipher: crypto.CipherGCM;
	};

	public abstract encryptionVitalsStart(fileSize: number): number;
	public abstract encryptedFileEnd(fileSize: number): number;
}
