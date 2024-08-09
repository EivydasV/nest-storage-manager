import * as fs from 'node:fs';
import { StatOptions } from 'node:fs';
import * as fsPromises from 'node:fs/promises';
import * as path from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { FileManagerError } from '../error/file-manager.error';
import { InvalidPathError } from '../error/invalid-path.error';
import { FsHelper } from '../helper/fs.helper';
import {
	GetFileStatsReturnInterface,
	GetFileStreamOptions,
	GetFileStreamReturnInterface,
	GetFilesCursorOptions,
	LocalStorageOptionsInterface,
	UploadFileOptionsInterface,
} from '../interface/local-storage.interface';
import { FileType } from '../type/file.type';
import { AbstractStorage } from './abstract.storage';

export class LocalStorage extends AbstractStorage {
	private static localStorageDefaultOptions: LocalStorageOptionsInterface['options'] =
		{
			rootPath: process.cwd(),
			path: '',
		};

	private readonly localStorageOptions: LocalStorageOptionsInterface['options'];

	constructor(
		localStorageAllOptions: LocalStorageOptionsInterface,
		private readonly fsHelper: FsHelper,
	) {
		localStorageAllOptions.options = {
			...LocalStorage.localStorageDefaultOptions,
			...localStorageAllOptions.options,
		};

		super(localStorageAllOptions);

		this.localStorageOptions = localStorageAllOptions.options;
	}

	/**
	 * @throws InvalidPathError
	 * @throws FileDoesNotExistError
	 * @throws FileManagerError
	 */
	public async copy(
		fromRelativePath: string,
		toRelativePath: string,
	): Promise<string> {
		const from = this.getSafePath(fromRelativePath);
		const to = this.getSafePath(toRelativePath);

		await this.fsHelper.checkIfFileExists(from);

		await this.fsHelper.copy(from, to);

		return toRelativePath;
	}

	/**
	 * @throws InvalidPathError
	 * @throws FileDoesNotExistError
	 * @throws FileManagerError
	 */
	public async move(
		fromRelativePath: string,
		toRelativePath: string,
	): Promise<string> {
		const from = this.getSafePath(fromRelativePath);
		const to = this.getSafePath(toRelativePath);

		await this.fsHelper.checkIfFileExists(from);

		await this.fsHelper.move(from, to);

		return toRelativePath;
	}

	/**
	 * @throws InvalidPathError
	 * @throws FileDoesNotExistError
	 * @throws FileManagerError
	 */
	public async delete(filePath: string): Promise<boolean> {
		const safePath = this.getSafePath(filePath);

		await this.fsHelper.checkIfFileExists(safePath);

		await this.fsHelper.delete(safePath);

		return true;
	}

	/**
	 * @throws FileManagerError
	 * @throws FileTypeError
	 * @throws FileDownloadError
	 */
	public async upload(
		file: FileType,
		uploadOptions: UploadFileOptionsInterface = {},
	): Promise<string> {
		const { _file, _fileName, _options } = await this.getUploadParameters(
			file,
			uploadOptions,
		);

		return this.writeToDisk(_file, _fileName, _options);
	}

	/**
	 * @throws FileManagerError
	 * @throws FileTypeError
	 */
	public async *getFilesCursor(
		options?: GetFilesCursorOptions,
	): AsyncGenerator<GetFileStatsReturnInterface[], void, unknown> {
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
	public async doesFileExist(filePath: string): Promise<boolean> {
		const safePath = this.getSafePath(filePath);

		return this.fsHelper
			.checkIfFileExists(safePath)
			.then(() => true)
			.catch(() => false);
	}

	/**
	 * @throws InvalidPathError
	 * @throws FileDoesNotExistError
	 * @throws FileManagerError
	 * @throws FileTypeError
	 */
	public async getFileStats(
		fileRelativePath: string,
		options?: StatOptions & {
			bigint?: false | undefined;
		},
	): Promise<GetFileStatsReturnInterface> {
		const safePath = this.getSafePath(fileRelativePath);

		await this.fsHelper.checkIfFileExists(safePath);

		return await this.internalGetFileStats(safePath, options);
	}

	/**
	 * @throws InvalidPathError
	 * @throws FileDoesNotExistError
	 * @throws FileManagerError
	 * @throws FileTypeError
	 */
	public async getFileStream(
		fileRelativePath: string,
		options?: GetFileStreamOptions,
	): Promise<GetFileStreamReturnInterface> {
		const safePath = this.getSafePath(fileRelativePath);
		await this.fsHelper.checkIfFileExists(safePath);

		const fileWithType = await this.internalGetFileStats(safePath);

		return {
			...fileWithType,
			stream: this.createReadStream(safePath, options),
		};
	}

	private async writeToDisk(
		file: FileType,
		fileName: string,
		options: UploadFileOptionsInterface,
	): Promise<string> {
		const filePath = this.generateFullPath(fileName, options);
		await this.fsHelper.makeDir(path.dirname(filePath), {
			recursive: true,
		});

		try {
			return await this.writeSteam(file, filePath);
		} catch (err) {
			if (options.deleteFileOnError) {
				this.logger.debug(`deleting file: "${filePath}"`);
				await this.fsHelper.delete(filePath).catch(() => {});
			}

			throw new FileManagerError(err);
		}
	}

	private async writeSteam(file: FileType, filePath: string): Promise<string> {
		await pipeline(
			await this.getReadStream(file),
			fs.createWriteStream(filePath),
		);

		return this.getRelativePath(filePath);
	}

	private getSafePath(filePath: string): string {
		const error = new InvalidPathError(filePath, this.localStorageOptions.path);

		const splitPath = filePath.split(path.sep);
		if (this.localStorageOptions.path !== splitPath.shift()) {
			throw error;
		}

		const resolvedPath = path.resolve(
			this.getStoragePath(),
			path.join(...splitPath),
		);

		if (!resolvedPath.startsWith(this.getStoragePath())) {
			throw error;
		}

		return resolvedPath;
	}

	private getRelativePath(absolutePath: string): string {
		// biome-ignore lint/style/noNonNullAssertion: <explanation>
		return path.relative(this.localStorageOptions.rootPath!, absolutePath);
	}

	private async internalGetFileStats(
		absoluteFilePath: string,
		options?: StatOptions & {
			bigint?: false | undefined;
		},
	): Promise<GetFileStatsReturnInterface> {
		const statPromise = this.fsHelper.stats(absoluteFilePath, options);
		const fileWithFileTypePromise = this.getFileType(absoluteFilePath);

		const [stat, fileWithFileType] = await Promise.all([
			statPromise,
			fileWithFileTypePromise,
		]);

		return {
			fileName: path.basename(absoluteFilePath),
			absolutePath: absoluteFilePath,
			relativePath: this.getRelativePath(absoluteFilePath),
			mimeType: fileWithFileType.fileType.mime,
			fileExtension: fileWithFileType.fileType.ext,
			stat,
		};
	}

	private async processFileBatch(
		files: fs.Dirent[],
	): Promise<GetFileStatsReturnInterface[]> {
		return Promise.all(
			files.map(async (file) => {
				const absolutePath = path.join(file.parentPath, file.name);

				return this.internalGetFileStats(absolutePath);
			}),
		);
	}
}
