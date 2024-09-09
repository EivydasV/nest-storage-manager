import * as fs from 'node:fs';
import * as fsPromises from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { Readable, Writable } from 'node:stream';
import { Injectable } from '@nestjs/common';
import { GetFileStreamLocalOptionsInterface } from '../interface';

export class TempFileManager {
	private readonly tempDir = path.join(os.tmpdir(), 'nest-storage-manager');

	constructor() {
		this.setUpCleanupHandler();
		this.init();
	}

	private init() {
		fs.mkdirSync(this.tempDir, { recursive: true });
	}

	private setUpCleanupHandler() {
		// Handle normal exit
		process.on('exit', () => {
			this.removeTempDirSync();
		});

		// Handle CTRL+C
		process.on('SIGINT', () => {
			this.removeTempDir().then(() => process.exit());
		});

		// Handle "kill pid"
		process.on('SIGTERM', () => {
			this.removeTempDir().then(() => process.exit());
		});

		// Handle uncaught exceptions
		process.on('uncaughtException', (error) => {
			console.error('Uncaught Exception:', error);
			this.removeTempDir().then(() => process.exit(1));
		});

		// Handle unhandled promise rejections
		process.on('unhandledRejection', (reason, promise) => {
			console.error('Unhandled Rejection at:', promise, 'reason:', reason);
			this.removeTempDir().then(() => process.exit(1));
		});
	}

	private async removeTempDir() {
		await fsPromises.rm(this.tempDir, { recursive: true, force: true });
	}

	private removeTempDirSync() {
		fs.rmSync(this.tempDir, { recursive: true, force: true });
	}

	async createTempFileWriteStream(
		fileName: string,
	): Promise<{ writeStream: Writable; filePath: string }> {
		const ext = path.extname(fileName);
		const tmpFileName = `${crypto.randomUUID()}${ext}`;

		const filePath = path.join(this.tempDir, tmpFileName);

		return { filePath, writeStream: fs.createWriteStream(filePath) };
	}

	async removeTempFile(filePath: string): Promise<void> {
		if (!filePath.startsWith(this.tempDir)) {
			throw new Error(`"${filePath}" is not a temp file`);
		}

		await fsPromises.unlink(filePath).catch(() => {});
	}

	createTempFileReadStream(
		filePath: string,
		options?: GetFileStreamLocalOptionsInterface,
	): Readable {
		if (!filePath.startsWith(this.tempDir)) {
			throw new Error(`"${filePath}" is not a temp file`);
		}

		return fs
			.createReadStream(filePath, options)
			.on('close', async () => {
				await this.removeTempFile(filePath);
			})
			.on('error', (e) => console.error(e));
	}
}
