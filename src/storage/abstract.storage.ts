import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { Readable } from 'node:stream';
import * as streamWeb from 'node:stream/web';
import { Logger } from '@nestjs/common';
import { FileTypeResult } from 'file-type';
import { StorageEnum } from '../enum';
import { FileDownloadError } from '../error';
import { FileTypeError } from '../error';
import {
	GetFileStatsReturnInterface,
	GetFileStreamOptions,
	GetFileStreamReturnInterface,
	GetFilesCursorOptions,
	UploadFileOptionsInterface,
} from '../interface';
import { StorageProviders } from '../interface';
import { FileType } from '../type';
import { importESM } from '../util/import-esm-module';
import { isValidURL } from '../util/is-valid-url';

export abstract class AbstractStorage {
	protected readonly logger = new Logger(AbstractStorage.name);

	protected static defaultUploadOptions: UploadFileOptionsInterface = {
		generateSubDirectories: true,
		generateUniqueFileName: true,
		deleteFileOnError: true,
	};

	protected static defaultGetFilesCursorOptions = {
		perPage: 10,
	};

	protected constructor(private readonly uploadOptions: StorageProviders) {}

	/**
	 *	Uploads a file to the storage.
	 *	Returns the relative path of the uploaded file.
	 */
	protected abstract upload(
		file: FileType,
		options?: UploadFileOptionsInterface,
	): Promise<string>;

	/**
	 * Uploads multiple files to the storage.
	 * Equivalent to
	 * @example Promise.allSettled(this.storage.upload(file), this.storage.upload(file))
	 */
	public async uploadMany(
		files: FileType[],
		options?: UploadFileOptionsInterface,
	): Promise<PromiseSettledResult<string>[]> {
		const promises = files.map((file) => this.upload(file, options));

		return Promise.allSettled(promises);
	}

	/**
	 * Deletes a file from the storage.
	 * Returns `true` if the file was deleted successfully, otherwise `false`.
	 */
	protected abstract delete(relativeFilePath: string): Promise<boolean>;

	/**
	 * Deletes multiple files from the storage.
	 *  Equivalent to
	 *  @example Promise.allSettled(this.storage.delete(relativeFilePath), this.storage.delete(relativeFilePath))
	 */
	public async deleteMany(
		relativeFilePaths: string[],
	): Promise<PromiseSettledResult<boolean>[]> {
		const promises = relativeFilePaths.map((relativeFilePath) =>
			this.delete(relativeFilePath),
		);

		return Promise.allSettled(promises);
	}

	/**
	 * Checks if a file exists in the storage.
	 * Returns `true` if the file exists, otherwise `false`.
	 */
	protected abstract doesFileExist(relativeFilePath: string): Promise<boolean>;

	/**
	 *  Checks if multiple files exist in the storage.
	 *  Equivalent to
	 *  @example Promise.allSettled(this.storage.doesFileExist(relativeFilePath), this.storage.doesFileExist(relativeFilePath))
	 */

	public async doesFileExistMany(
		relativeFilePaths: string[],
	): Promise<PromiseSettledResult<boolean>[]> {
		const promises = relativeFilePaths.map((relativeFilePath) =>
			this.doesFileExist(relativeFilePath),
		);

		return Promise.allSettled(promises);
	}

	/**
	 * Returns an async generator that yields file stats for each file in the storage.
	 */
	protected abstract getFilesCursor(
		options?: GetFilesCursorOptions,
	): AsyncGenerator<GetFileStatsReturnInterface[], void, unknown>;

	/**
	 * Copy a file to provided path.
	 * Returns the relative path of the copied file.
	 * It can only copy to a same storage path.
	 */
	protected abstract copy(
		fromRelativePath: string,
		toRelativePath: string,
	): Promise<string>;

	/**
	 *  Copies multiple files to provided paths
	 *  Equivalent to
	 *  @example Promise.allSettled(this.storage.copy(relativePath), this.storage.copy(relativePath))
	 */
	public async copyMany(
		relativePaths: {
			fromRelativePath: string;
			toRelativePath: string;
		}[],
	): Promise<PromiseSettledResult<string>[]> {
		const promises = relativePaths.map(({ fromRelativePath, toRelativePath }) =>
			this.copy(fromRelativePath, toRelativePath),
		);

		return Promise.allSettled(promises);
	}

	/**
	 * Moves a file to provided path.
	 * Returns the relative path of the moved file.
	 * It can only move to a same storage path.
	 */
	protected abstract move(
		fromRelativePath: string,
		toRelativePath: string,
	): Promise<string>;

	/**
	 *  Moves multiple files to provided paths.
	 *  Equivalent to
	 *  @example Promise.allSettled(this.storage.move(relativePath), this.storage.move(relativePath))
	 */
	public async moveMany(
		relativePaths: {
			fromRelativePath: string;
			toRelativePath: string;
		}[],
	): Promise<PromiseSettledResult<string>[]> {
		const promises = relativePaths.map(({ fromRelativePath, toRelativePath }) =>
			this.move(fromRelativePath, toRelativePath),
		);

		return Promise.allSettled(promises);
	}

	protected abstract getFileStream(
		fileRelativePath: string,
	): Promise<GetFileStreamReturnInterface>;

	protected generateFullPath(
		fileName: string,
		options: UploadFileOptionsInterface,
	): string {
		return path.join(
			this.getStoragePath(),
			this.generateSubDirectories(options),
			fileName,
		);
	}

	protected async guessFileType(
		file: FileType,
		options: UploadFileOptionsInterface,
	): Promise<{ file: Buffer | string | Readable; fileName: string }> {
		const { file: fileFromType, fileType } = await this.getFileType(file);

		return {
			file: fileFromType,
			fileName: this.generateUniqueFileName(`base.${fileType.ext}`, options),
		};
	}

	protected async getFileType(
		file: FileType,
	): Promise<{ file: Buffer | string | Readable; fileType: FileTypeResult }> {
		let fileType: FileTypeResult | undefined;
		let _file = file;

		const typeDetector =
			await importESM<typeof import('file-type')>('file-type');

		if (Buffer.isBuffer(file)) {
			fileType = await typeDetector.fileTypeFromBuffer(file);
		} else if (file instanceof Readable) {
			const fileStream = await typeDetector.fileTypeStream(file);
			_file = fileStream;
			fileType = fileStream.fileType;
		} else {
			fileType = await typeDetector.fileTypeFromFile(file);
		}

		if (!fileType) {
			throw new FileTypeError();
		}

		return {
			file: _file,
			fileType: fileType,
		};
	}

	private generateSubDirectories(options: UploadFileOptionsInterface): string {
		if (typeof options.generateSubDirectories === 'function') {
			return options.generateSubDirectories();
		}

		if (options.generateSubDirectories === false) {
			return '';
		}

		const pathArray = crypto.randomBytes(4).toString('hex').split('');

		return path.join(...pathArray);
	}

	private generateUniqueFileName(
		fileName: string,
		options: UploadFileOptionsInterface,
	): string {
		const fileExtension = path.extname(fileName);

		if (typeof options.generateUniqueFileName === 'function') {
			return options.generateUniqueFileName(fileExtension);
		}

		return `${crypto.randomUUID()}${fileExtension}`;
	}

	protected async getUploadParameters(
		file: FileType,
		uploadOptions: UploadFileOptionsInterface,
	): Promise<{
		_file: Buffer | string | Readable;
		_fileName: string;
		_options: UploadFileOptionsInterface;
	}> {
		let _file = file;
		const options = {
			...AbstractStorage.defaultUploadOptions,
			...uploadOptions,
		};

		if (typeof file === 'string' && isValidURL(file)) {
			_file = await this.downloadFile(file);
		}

		const fileTypeAndFile = await this.guessFileType(_file, options);

		_file = fileTypeAndFile.file;

		return {
			_file,
			_fileName: fileTypeAndFile.fileName,
			_options: options,
		};
	}

	protected async getReadStream(file: FileType): Promise<Readable> {
		let readStream: Readable;

		if (Buffer.isBuffer(file)) {
			readStream = Readable.from(file);
		} else if (file instanceof Readable) {
			readStream = file;
		} else {
			readStream = fs.createReadStream(file);
		}

		return readStream;
	}

	protected async downloadFile(url: string): Promise<Readable> {
		const res = await fetch(url);
		if (!res.ok || !res.body) {
			throw new FileDownloadError(`Could not download file from "${url}"`);
		}

		const typeDetector =
			await importESM<typeof import('file-type')>('file-type');

		let isFile = false;

		for (const mimeType of typeDetector.supportedMimeTypes) {
			if (res.headers.get('content-type')?.includes(mimeType)) {
				isFile = true;

				break;
			}
		}

		if (!isFile) {
			throw new FileDownloadError(
				`Provided url "${url}" did not return a file. Returned content-type: "${res.headers.get('content-type')}"`,
			);
		}

		return Readable.fromWeb(res.body as streamWeb.ReadableStream);
	}

	protected getStoragePath(): string {
		const paths = [
			this.uploadOptions.storage === StorageEnum.LOCAL
				? // biome-ignore lint/style/noNonNullAssertion: <explanation>
					this.uploadOptions.options.rootPath!
				: '',
			this.uploadOptions.options.path || '',
		].filter(Boolean);

		return path.join(...paths);
	}

	protected createReadStream(safePath: string, options?: GetFileStreamOptions) {
		return fs.createReadStream(safePath, options).on('error', (err) => {
			this.logger.error(err);
		});
	}
}
