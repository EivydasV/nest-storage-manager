import * as fs from 'node:fs';
import * as path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { FileManagerError, InvalidPathError } from '../error';
import { FsHelper } from '../helper';
import {
	CopyOrMoveInputInterface,
	GetFileStatsLocalOptionsType,
	GetFileStatsLocalReturnInterface,
	GetFileStreamLocalOptionsInterface,
	GetFileStreamLocalReturnInterface,
	GetFilesCursorLocalOptions,
	GetFilesCursorLocalReturnType,
	MoveReturnType,
	StorageLocalOptionsType,
	StorageOptionsLocalInterface,
	UploadFileLocalOptionsInterface,
} from '../interface';
import { FileType } from '../type';
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
	) {
		super(localStorageOptions);
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
	public async delete(relativePath: string): Promise<boolean> {
		const safePath = this.getSafePath(relativePath);

		await this.fsHelper.checkIfFileExists(safePath);

		await this.fsHelper.delete(safePath);

		return true;
	}

	public async deleteMany(
		relativePaths: string[],
	): Promise<PromiseSettledResult<boolean>[]> {
		const promises = relativePaths.map((relativePath) =>
			this.delete(relativePath),
		);

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
	): Promise<string> {
		const uploadOptions = {
			...AbstractStorage.defaultUploadOptions,
			...options,
		};

		return this.writeToDisk(file, uploadOptions);
	}

	public async uploadMany(
		files: FileType[],
		options?: UploadFileLocalOptionsInterface,
	): Promise<PromiseSettledResult<string>[]> {
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
	public async doesFileExist(relativePath: string): Promise<boolean> {
		const safePath = this.getSafePath(relativePath);

		try {
			await this.fsHelper.checkIfFileExists(safePath);

			return true;
		} catch (err) {
			return false;
		}
	}

	public async doesFileExistMany(
		relativePaths: string[],
	): Promise<PromiseSettledResult<boolean>[]> {
		const promises = relativePaths.map((relativePath) =>
			this.doesFileExist(relativePath),
		);

		return Promise.allSettled(promises);
	}

	/**
	 * @throws InvalidPathError
	 * @throws FileDoesNotExistError
	 * @throws FileManagerError
	 * @throws FileTypeError
	 */
	public async getFileStats(
		relativePath: string,
		options?: GetFileStatsLocalOptionsType,
	): Promise<GetFileStatsLocalReturnInterface> {
		const safePath = this.getSafePath(relativePath);

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
		relativePath: string,
		options?: GetFileStreamLocalOptionsInterface,
	): Promise<GetFileStreamLocalReturnInterface> {
		const safePath = this.getSafePath(relativePath);
		await this.fsHelper.checkIfFileExists(safePath);

		const fileWithType = await this.internalGetFileStats(safePath);

		return {
			...fileWithType,
			stream: this.createReadStream(safePath, options),
		};
	}

	private async writeToDisk(
		file: FileType,
		options: UploadFileLocalOptionsInterface,
	): Promise<string> {
		const { file: fileFromType, fileName } = await this.getFile(file, options);

		const filePath = await this.generateFullPath(fileName, options);

		try {
			return await this.writeSteam(fileFromType, filePath);
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
		const error = new InvalidPathError(filePath, this.options.path);

		const splitPath = filePath.split(path.sep);
		if (this.options.path !== splitPath.shift()) {
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
		return path.relative(this.options.rootPath, absolutePath);
	}

	private async internalGetFileStats(
		absoluteFilePath: string,
		options?: GetFileStatsLocalOptionsType,
	): Promise<GetFileStatsLocalReturnInterface> {
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
	): Promise<GetFileStatsLocalReturnInterface[]> {
		return Promise.all(
			files.map(async (file) => {
				const absolutePath = path.join(file.parentPath, file.name);

				return this.internalGetFileStats(absolutePath);
			}),
		);
	}

	private async generateFullPath(
		fileName: string,
		options: UploadFileLocalOptionsInterface,
	): Promise<string> {
		const genPath = path.join(
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
		return path.join(this.options.rootPath, this.options.path);
	}
}
