import * as fs from 'node:fs';
import { Readable } from 'node:stream';
import { MimeType } from 'file-type/core';
import { ExtensionDetectionMethod, StorageEnum } from '../enum';
import { EncryptionAlgorithm } from '../type';
import { UploadFileOptionsInterface } from './abstract-storage.interface';
import { BaseStorageOptionsInterface } from './storage-module-options.interface';

export type StorageLocalOptionsType = Required<
	Pick<StorageOptionsLocalInterface['options'], 'rootPath'>
> &
	StorageOptionsLocalInterface['options'];

export type GetFileStatsLocalOptionsType = fs.StatOptions & {
	bigint?: false | undefined;
};

export type GetFilesCursorLocalReturnType = AsyncGenerator<
	GetFileStatsLocalReturnInterface[],
	void,
	unknown
>;

export interface UploadFileLocalReturnInterface {
	key: string;
	absolutePath: string;
	bucket: string;
}

/**
 * Interface for configuring local storage options.
 */
export interface StorageOptionsLocalInterface
	extends BaseStorageOptionsInterface<StorageEnum.LOCAL> {
	options: {
		/**
		 * The storage location to the local storage directory.
		 * It will suffix for the `rootPath`.
		 */
		bucket: string;

		/**
		 * The root path of the local storage directory.
		 * @default process.cwd()
		 */
		rootPath?: string;

		encryptionKey?: string;
		encryptionAlgorithm?: EncryptionAlgorithm;
	};
}

/**
 * Interface for configuring file upload options.
 */
export interface UploadFileLocalOptionsInterface
	extends UploadFileOptionsInterface {
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
export interface GetFilesCursorLocalOptions
	extends Omit<fs.OpenDirOptions, 'recursive'> {
	/**
	 * The number of files to return per page.
	 * @default 10
	 */
	perPage?: number;
}

/**
 * Interface for configuring the start and end positions of a file stream.
 */
export interface GetFileStreamLocalOptionsInterface {
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
export interface GetFileStatsLocalReturnInterface {
	/**
	 * The file name. Example: `fileName.jpg`
	 */
	fileName: string;

	/**
	 * The absolute path of the file. Example: `/home/user/uploads/fileName.jpg`
	 */
	absolutePath: string;

	/**
	 * The key of the file
	 */
	key: string;

	/**
	 * The storage location of the file. Example: `uploads`
	 */
	bucket: string;

	/**
	 * The file type of the file. Example: `image/jpeg`
	 */
	mimeType: MimeType;

	/**
	 * The file extension. Example: `jpeg`
	 */
	fileExtension: string;

	/**
	 * Node.js `fs.Stats` object.
	 */
	stat: fs.Stats;
}

/**
 * Interface for returning a readable stream of a file.
 */
export interface GetFileLocalReturnInterface
	extends GetFileStatsLocalReturnInterface {
	/**
	 * The readable stream of the file.
	 */
	stream: Readable;
}
