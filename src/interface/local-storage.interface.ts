import { OpenDirOptions, Stats } from 'node:fs';
import * as fs from 'node:fs';
import { Readable } from 'node:stream';
import { MimeType } from 'file-type/core';
import { StorageEnum } from '../enum';
import { BaseStorageOptionsInterface } from './storage-module-options.interface';

/**
 * Interface for configuring local storage options.
 */
export interface LocalStorageOptionsInterface
	extends BaseStorageOptionsInterface<StorageEnum.LOCAL> {
	options: {
		/**
		 * The path to the local storage directory.
		 * It will suffix for the `rootPath`.
		 */
		path: string;

		/**
		 * The root path of the local storage directory.
		 * @default process.cwd()
		 */
		rootPath?: string;
	};
}

/**
 * Interface for configuring file upload options.
 */
export interface UploadFileOptionsInterface {
	/**
	 * Determines whether to generate subdirectories for file storage.
	 * When set to `true`, subdirectories will be generated to improve file search speed.
	 * Example path: `uploads/9/0/1/d/0/2/2/f/fileName.jpg`, where the subdirectory is `/9/0/1/d/0/2/2/f/`.
	 * You can disable this behavior by specifying `false`, or you can pass a custom function that returns the subdirectory string path.
	 *
	 * @default true
	 */
	generateSubDirectories?: boolean | (() => string);

	/**
	 * Determines whether to generate a unique file name.
	 * When set to `true`, a unique file name is generated using `crypto.randomUUID()`.
	 * You can also specify a custom function that returns the file name based on the file extension.
	 *
	 * @default true
	 */
	generateUniqueFileName?: true | ((fileExtension: string) => string);

	/**
	 * Determines whether to delete a file if an error occurs while writing it using a stream.
	 * If set to `true`, the file will be deleted in case of a write error to prevent it from being left in a corrupted state.
	 *
	 * @default true
	 */
	deleteFileOnError?: boolean;
}

/**
 * Interface for configuring file upload options.
 */
export interface GetFilesCursorOptions
	extends Omit<OpenDirOptions, 'recursive'> {
	/**
	 * The number of files to return per page.
	 * @default 10
	 */
	perPage?: number;
}

/**
 * Interface for configuring the start and end positions of a file stream.
 */
export interface GetFileStreamOptions {
	start?: number;
	end?: number;
	highWaterMark?: number;
	encoding?: BufferEncoding;
	flags?: string;
	mode?: number;
	signal?: AbortSignal;
	autoClose?: boolean;
	emitClose?: boolean;
}

/**
 * Interface for returning file stats.
 */
export interface GetFileStatsReturnInterface {
	/**
	 * The file name. Example: `fileName.jpg`
	 */
	fileName: string;

	/**
	 * The absolute path of the file. Example: `/home/user/uploads/fileName.jpg`
	 */
	absolutePath: string;

	/**
	 * The relative path of the file. Example: `uploads/fileName.jpg`
	 */
	relativePath: string;

	/**
	 * The file type of the file. Example: `image/jpeg`
	 */
	mimeType: MimeType;

	/**
	 * The file extension. Example: `.jpeg`
	 */
	fileExtension: string;

	/**
	 * Node.js `fs.Stats` object.
	 */
	stat: Stats;
}

/**
 * Interface for returning a readable stream of a file.
 */
export interface GetFileStreamReturnInterface {
	/**
	 * The readable stream of the file.
	 */
	stream: Readable;

	/**
	 * The file name. Example: `fileName.jpg`
	 */
	fileName: string;

	/**
	 * The absolute path of the file. Example: `/home/user/uploads/fileName.jpg`
	 */
	absolutePath: string;

	/**
	 * The relative path of the file. Example: `uploads/fileName.jpg`
	 */
	relativePath: string;

	/**
	 * The file type of the file. Example: `image/jpeg`
	 */
	mimeType: MimeType;

	/**
	 * The file extension. Example: `.jpeg`
	 */
	fileExtension: string;

	/**
	 * Node.js `fs.Stats` object.
	 */
	stat: fs.Stats;
}
