import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { Readable, Writable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { Chacha20Poly1305EncryptionStrategy } from '../encryption-strategy';
import { FileEncryptor } from '../encryptor/file.encryptor';
import { FileManagerError, InvalidPathError } from '../error';
import { FsHelper } from '../helper';
import {
	CopyOrMoveInputInterface,
	GetFileLocalReturnInterface,
	GetFileStatsLocalOptionsType,
	GetFileStatsLocalReturnInterface,
	GetFileStreamLocalOptionsInterface,
	GetFilesCursorLocalOptions,
	GetFilesCursorLocalReturnType,
	MoveReturnType,
	StorageLocalOptionsType,
	StorageOptionsLocalInterface,
	UploadFileLocalOptionsInterface,
	UploadFileLocalReturnInterface,
} from '../interface';
import { TempFileManager } from '../manager';
import { EncryptionAlgorithm, FileType } from '../type';
import { AbstractStorage } from './abstract.storage';

export class LocalStorage extends AbstractStorage {
	private static localStorageDefaultOptions: Required<
		Pick<StorageOptionsLocalInterface['options'], 'rootPath'>
	> = {
		rootPath: process.cwd(),
	};

	constructor(
		private readonly localStorageOptions: StorageOptionsLocalInterface,
		private readonly fsHelper: FsHelper,
		private readonly fileEncryptor: FileEncryptor,
		private readonly tempFileManager: TempFileManager,
	) {
		super(localStorageOptions);

		this.setEncryptionStrategy(
			this.localStorageOptions.options.encryptionAlgorithm,
		);
	}

	private setEncryptionStrategy(strategy?: EncryptionAlgorithm) {
		if (strategy === 'chacha20-poly1305') {
			this.fileEncryptor.setStrategy(new Chacha20Poly1305EncryptionStrategy());
		}
	}

	public get options(): StorageLocalOptionsType {
		return {
			...LocalStorage.localStorageDefaultOptions,
			...this.localStorageOptions.options,
		};
	}

	/**
	 * @throws InvalidPathError
	 * @throws FileDoesNotExistError
	 * @throws FileManagerError
	 */
	public async copy({ to, from }: CopyOrMoveInputInterface): Promise<string> {
		const safeFrom = this.getSafePath(from);
		const safeTo = this.getSafePath(to);
		await this.fsHelper.checkIfFileExists(safeFrom);

		await this.fsHelper.copy(safeFrom, safeTo);

		return safeTo;
	}

	/**
	 * @param {CopyOrMoveInputInterface} inputs
	 *
	 * @return {Promise<PromiseSettledResult<string>[]>}
	 */
	public async copyMany(
		inputs: CopyOrMoveInputInterface[],
	): Promise<PromiseSettledResult<string>[]> {
		const promises = inputs.map((input) => this.copy(input));

		return Promise.allSettled(promises);
	}

	/**
	 * @throws InvalidPathError
	 * @throws FileDoesNotExistError
	 * @throws FileManagerError
	 */
	public async move({ to, from }: CopyOrMoveInputInterface): Promise<string> {
		const safeFrom = this.getSafePath(from);
		const safeTo = this.getSafePath(to);

		await this.fsHelper.checkIfFileExists(safeFrom);

		await this.fsHelper.move(safeFrom, safeTo);

		return safeTo;
	}

	public async moveMany(
		inputs: CopyOrMoveInputInterface[],
	): Promise<PromiseSettledResult<MoveReturnType>[]> {
		const promises = inputs.map((input) => this.move(input));

		return Promise.allSettled(promises);
	}

	/**
	 * @throws InvalidPathError
	 * @throws FileDoesNotExistError
	 * @throws FileManagerError
	 */
	public async delete(key: string): Promise<boolean> {
		const safePath = this.getSafePath(key);

		await this.fsHelper.checkIfFileExists(safePath);

		await this.fsHelper.delete(safePath);

		return true;
	}

	public async deleteMany(
		keys: string[],
	): Promise<PromiseSettledResult<boolean>[]> {
		const promises = keys.map((key) => this.delete(key));

		return Promise.allSettled(promises);
	}

	/**
	 * @throws FileManagerError
	 * @throws FileTypeError
	 * @throws FileDownloadError
	 */
	public async upload(
		file: FileType,
		options?: UploadFileLocalOptionsInterface,
	): Promise<UploadFileLocalReturnInterface> {
		const uploadOptions = {
			...AbstractStorage.defaultUploadOptions,
			...options,
		};

		const fileKey = await this.writeToDisk(file, uploadOptions);

		return {
			bucket: this.options.bucket,
			key: this.getRelativePath(fileKey),
			absolutePath: fileKey,
		};
	}

	public async uploadMany(
		files: FileType[],
		options?: UploadFileLocalOptionsInterface,
	): Promise<PromiseSettledResult<UploadFileLocalReturnInterface>[]> {
		const promises = files.map((file) => this.upload(file, options));

		return Promise.allSettled(promises);
	}

	/**
	 * @throws FileManagerError
	 * @throws FileTypeError
	 */
	public async *getFilesCursor(
		options?: GetFilesCursorLocalOptions,
	): GetFilesCursorLocalReturnType {
		const { perPage, ...mergeOptions } = {
			...AbstractStorage.defaultGetFilesCursorOptions,
			...options,
		};

		const files = await this.fsHelper.openDir(this.getStoragePath(), {
			...mergeOptions,
			recursive: true,
		});

		let batch: fs.Dirent[] = [];

		for await (const file of files) {
			if (file.isFile()) {
				batch.push(file);

				if (batch.length >= perPage) {
					yield await this.processFileBatch(batch);
					batch = [];
				}
			}
		}

		if (batch.length > 0) {
			yield await this.processFileBatch(batch);
		}
	}

	/**
	 * @throws InvalidPathError
	 */
	public async doesFileExist(key: string): Promise<boolean> {
		const safePath = this.getSafePath(key);

		try {
			await this.fsHelper.checkIfFileExists(safePath);

			return true;
		} catch (err) {
			return false;
		}
	}

	public async doesFileExistMany(
		keys: string[],
	): Promise<PromiseSettledResult<boolean>[]> {
		const promises = keys.map((key) => this.doesFileExist(key));

		return Promise.allSettled(promises);
	}

	/**
	 * @throws InvalidPathError
	 * @throws FileDoesNotExistError
	 * @throws FileManagerError
	 * @throws FileTypeError
	 */
	public async getFileStats(
		key: string,
		options?: GetFileStatsLocalOptionsType,
	): Promise<GetFileStatsLocalReturnInterface> {
		const safePath = this.getSafePath(key);

		await this.fsHelper.checkIfFileExists(safePath);

		return await this.internalGetFileStats(safePath, options);
	}

	/**
	 * @throws InvalidPathError
	 * @throws FileDoesNotExistError
	 * @throws FileManagerError
	 * @throws FileTypeError
	 */
	public async getFile(
		key: string,
		options: GetFileStreamLocalOptionsInterface = {},
	): Promise<GetFileLocalReturnInterface> {
		const safePath = this.getSafePath(key);
		await this.fsHelper.checkIfFileExists(safePath);

		const fileWithType = await this.internalGetFileStats(safePath);

		const fileStream: Readable = this.createReadStream(safePath, options);

		if (this.fileEncryptor.isEncryptionEnabled()) {
			const encryptionData = this.createReadStream(safePath, {
				start: this.fileEncryptor.encryptionVitalsStart(fileWithType.stat.size),
			});

			const { authTag, iv, encryptionTag } =
				await this.fileEncryptor.getEncryptionVitals(encryptionData);

			if (this.fileEncryptor.isEncrypted(encryptionTag)) {
				const fileEnd = this.fileEncryptor.encryptedFileEnd(
					fileWithType.stat.size,
				);
				const decrypt = this.fileEncryptor.createDecryption(iv, authTag);
				const fileDecrypt = this.createReadStream(safePath, {
					end: fileEnd,
				});
				// const { filePath, writeStream } =
				// 	await this.tempFileManager.createTempFileWriteStream(key);
				//
				// try {
				// 	await pipeline(fileDecrypt, decrypt, writeStream);
				// } catch (err) {
				// 	await this.tempFileManager.removeTempFile(filePath);
				//
				// 	throw err;
				// }
				//
				// fileStream = this.tempFileManager.createTempFileReadStream(filePath);
			}
		}

		return {
			...fileWithType,
			stream: fileStream,
		};
	}

	private async writeToDisk(
		file: FileType,
		options: UploadFileLocalOptionsInterface,
	): Promise<string> {
		const { file: fileFromType, fileName } = await this.getFileInfo(
			file,
			options,
		);

		const filePath = await this.generateFullPath(fileName, options);

		try {
			return await this.writeSteam(fileFromType, filePath);
		} catch (err) {
			if (options.deleteFileOnError) {
				this.logger.debug(`deleting file: "${filePath}"`);
				await this.fsHelper.delete(filePath).catch(() => {});
			}

			throw err;
		}
	}

	private async writeSteam(file: FileType, filePath: string): Promise<string> {
		const streams: (Readable | Writable)[] = [this.getReadStream(file)];

		let cipher: crypto.CipherGCM | null = null;
		let iv: Buffer | null = null;
		if (this.fileEncryptor.isEncryptionEnabled()) {
			const { iv: newIv, cipher: newCipher } =
				this.fileEncryptor.createEncryption();

			iv = newIv;
			cipher = newCipher;
			streams.push(cipher);
		}

		streams.push(this.createWriteStream(filePath));

		await pipeline(streams);

		if (this.fileEncryptor.isEncryptionEnabled()) {
			if (!cipher || !iv) {
				throw new Error('Cipher is missing or iv is missing');
			}
			console.log('auth', cipher.getAuthTag().toString('hex'));
			console.log('iv', iv.toString('hex'));

			const createReadStream = this.createWriteStream(filePath, { flags: 'a' });
			await this.fileEncryptor.appendEncryptionVitals(
				createReadStream,
				cipher.getAuthTag(),
				iv,
			);
		}

		return filePath;
	}

	public getSafePath(filePath: string): string {
		const resolvedPath = path.resolve(this.getStoragePath(), filePath);

		if (!resolvedPath.startsWith(this.getStoragePath())) {
			throw new InvalidPathError(resolvedPath);
		}

		return resolvedPath;
	}

	private getRelativePath(absolutePath: string): string {
		return path.relative(this.getStoragePath(), absolutePath);
	}

	private async internalGetFileStats(
		absoluteFilePath: string,
		options?: GetFileStatsLocalOptionsType,
	): Promise<GetFileStatsLocalReturnInterface> {
		const statPromise = await this.fsHelper.stats(absoluteFilePath, options);
		const fileTypePromise = await this.getFileTypeFromPath(absoluteFilePath);

		const [stat, fileType] = await Promise.all([statPromise, fileTypePromise]);

		return {
			bucket: this.options.bucket,
			fileName: path.basename(absoluteFilePath),
			absolutePath: absoluteFilePath,
			key: this.getRelativePath(absoluteFilePath),
			mimeType: fileType.mime,
			fileExtension: fileType.ext,
			stat,
		};
	}

	private async processFileBatch(
		files: fs.Dirent[],
	): Promise<GetFileStatsLocalReturnInterface[]> {
		return Promise.all(
			files.map(async (file) => {
				const absolutePath = this.joinPath(file.parentPath, file.name);

				return this.internalGetFileStats(absolutePath);
			}),
		);
	}

	private async generateFullPath(
		fileName: string,
		options: UploadFileLocalOptionsInterface,
	): Promise<string> {
		const genPath = this.joinPath(
			this.getStoragePath(),
			this.generateSubDirectories(options),
			fileName,
		);

		await this.fsHelper.makeDir(path.dirname(genPath), {
			recursive: true,
		});

		return genPath;
	}

	private getStoragePath(): string {
		return this.joinPath(this.options.rootPath, this.options.bucket);
	}
}
