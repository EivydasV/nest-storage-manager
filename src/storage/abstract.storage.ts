import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { Readable } from 'node:stream';
import * as streamWeb from 'node:stream/web';
import { Logger } from '@nestjs/common';
import { FileTypeResult } from 'file-type';
import { FileDownloadError, FileTypeError } from '../error';
import {
	CopyFileOptionsType,
	CopyOrMoveInputInterface,
	CopyReturnType,
	DeleteFileOptionsType,
	DeleteReturnType,
	DoesFileExistOptionsType,
	GetFileStatsOptionsType,
	GetFileStatsReturnType,
	GetFileStreamLocalOptionsInterface,
	GetFileStreamOptionsType,
	GetFileStreamReturnType,
	GetFilesCursorOptions,
	GetFilesCursorReturnType,
	GetOptionsType,
	MoveFileOptionsType,
	MoveReturnType,
	StorageProvidersType,
	UploadFileLocalOptionsInterface,
	UploadFileOptionsType,
	UploadReturnType,
} from '../interface';
import { FileType } from '../type';
import { importESM, isValidURL, pathJoin } from '../util';

export abstract class AbstractStorage {
	protected readonly logger = new Logger(AbstractStorage.name);

	protected static defaultUploadOptions: UploadFileLocalOptionsInterface = {
		generateSubDirectories: true,
		generateUniqueFileName: true,
		deleteFileOnError: true,
	};

	protected static defaultGetFilesCursorOptions = {
		perPage: 10,
	};

	protected constructor(
		private readonly storageOptions: StorageProvidersType,
	) {}

	/**
	 * Returns options which were passed to `register` or `registerAsync` method.
	 */
	public abstract get options(): GetOptionsType;

	/**
	 * Uploads a file to the storage.
	 */
	public abstract upload(
		file: FileType,
		options?: UploadFileOptionsType,
	): Promise<UploadReturnType>;

	/**
	 * Uploads multiple files to the storage.
	 * Equivalent to
	 * @example Promise.allSettled(this.storage.upload(file), this.storage.upload(file))
	 */
	public abstract uploadMany(
		files: FileType[],
		options?: UploadFileLocalOptionsInterface,
	): Promise<PromiseSettledResult<UploadReturnType>[]>;

	/**
	 * Deletes a file from the storage.
	 */
	public abstract delete(
		path: string,
		options?: DeleteFileOptionsType,
	): Promise<DeleteReturnType>;

	/**
	 * Deletes multiple files from the storage.
	 *  Equivalent to
	 *  @example Promise.allSettled(this.storage.delete(key), this.storage.delete(key))
	 */
	public abstract deleteMany(
		paths: string[],
		options?: DeleteFileOptionsType,
	): Promise<PromiseSettledResult<DeleteReturnType>[]>;

	/**
	 * Checks if a file exists in the storage.
	 * Returns `true` if the file exists, otherwise `false`.
	 */
	public abstract doesFileExist(
		path: string,
		options?: DoesFileExistOptionsType,
	): Promise<boolean>;

	/**
	 *  Checks if multiple files exist in the storage.
	 *  Equivalent to
	 *  @example Promise.allSettled(this.storage.doesFileExist(key), this.storage.doesFileExist(key))
	 */

	public abstract doesFileExistMany(
		paths: string[],
		options?: DoesFileExistOptionsType,
	): Promise<PromiseSettledResult<boolean>[]>;

	/**
	 * Returns an async generator that yields file stats for each file in the storage.
	 */
	public abstract getFilesCursor(
		options?: GetFilesCursorOptions,
	): GetFilesCursorReturnType;

	/**
	 * Returns file stats for a file.
	 */
	public abstract getFileStats(
		path: string,
		options?: GetFileStatsOptionsType,
	): Promise<GetFileStatsReturnType>;

	/**
	 * Copy a file to provided destination.
	 * It can only copy to a same storage path.
	 */
	public abstract copy(
		input: CopyOrMoveInputInterface,
		options?: CopyFileOptionsType,
	): Promise<CopyReturnType>;

	/**
	 *  Copies multiple files to provided paths
	 *  Equivalent to
	 *  @example Promise.allSettled(this.storage.copy(key), this.storage.copy(key))
	 */
	public abstract copyMany(
		input: CopyOrMoveInputInterface[],
	): Promise<PromiseSettledResult<CopyReturnType>[]>;

	/**
	 * Moves a file to provided path.
	 * Returns the key of the moved file.
	 * It can only move to a same storage path.
	 */
	public abstract move(
		input: CopyOrMoveInputInterface,
		options?: MoveFileOptionsType,
	): Promise<MoveReturnType>;

	/**
	 *  Moves multiple files to provided destinations.
	 *  Equivalent to
	 *  @example Promise.allSettled(this.storage.move(key), this.storage.move(key))
	 */
	public abstract moveMany(
		input: CopyOrMoveInputInterface[],
		options?: MoveFileOptionsType,
	): Promise<PromiseSettledResult<MoveReturnType>[]>;

	public abstract getFile(
		path: string,
		options?: GetFileStreamOptionsType,
	): Promise<GetFileStreamReturnType>;

	protected async getFileType(
		file: FileType,
	): Promise<{ file: FileType; fileType: FileTypeResult }> {
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

	protected generateSubDirectories(
		options: UploadFileLocalOptionsInterface,
	): string {
		if (typeof options.generateSubDirectories === 'function') {
			return options.generateSubDirectories();
		}

		if (options.generateSubDirectories === false) {
			return '';
		}

		const pathArray = crypto.randomBytes(4).toString('hex').split('');

		return this.joinPath(...pathArray);
	}

	protected generateUniqueFileName(
		ext: string,
		options: UploadFileLocalOptionsInterface,
	): string {
		if (typeof options.generateUniqueFileName === 'function') {
			return options.generateUniqueFileName(ext);
		}

		return `${crypto.randomUUID()}.${ext}`;
	}

	protected async getFileInfo(
		file: FileType,
		options: UploadFileLocalOptionsInterface,
	): Promise<{ file: FileType; fileName: string; fileType: FileTypeResult }> {
		let _file = file;
		if (isValidURL(_file)) {
			_file = await this.downloadFile(_file);
		}

		const { file: fileFromType, fileType } = await this.getFileType(_file);
		_file = fileFromType;

		const fileName = this.generateUniqueFileName(fileType.ext, options);

		return {
			file: _file,
			fileName,
			fileType,
		};
	}

	protected async getReadStream(file: FileType): Promise<Readable> {
		let readStream: Readable;

		if (Buffer.isBuffer(file)) {
			readStream = Readable.from(file);
		} else if (file instanceof Readable) {
			readStream = file;
		} else {
			readStream = this.createReadStream(file);
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

	protected createReadStream(
		safePath: string,
		options?: GetFileStreamLocalOptionsInterface,
	): fs.ReadStream {
		return fs.createReadStream(safePath, options).on('error', (err) => {
			this.logger.error(err);
		});
	}

	protected joinPath(...paths: string[]): string {
		return pathJoin(this.storageOptions.storage, ...paths);
	}
}
