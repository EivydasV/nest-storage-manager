import {
	CopyObjectCommandOutput,
	DeleteObjectCommandOutput,
	GetObjectCommandOutput,
	HeadObjectOutput,
	ListObjectsV2CommandOutput,
} from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { Paginator } from '@smithy/types/dist-types/pagination';
import { FileTypeResult } from 'file-type';
import { ExtensionDetectionMethod } from '../enum';
import { FileType } from '../type';
import {
	AwsS3StorageOptionsType,
	CopyFileS3OptionsType,
	DeleteS3OptionsType,
	GetFileStatsS3OptionsType,
	GetFileStreamS3OptionsType,
	GetFilesCursorS3OptionsInterface,
	MoveFileS3OptionsType,
	UploadS3FileOptionsInterface,
} from './aws-s3-storage.interface';
import {
	GetFileLocalReturnInterface,
	GetFileStatsLocalOptionsType,
	GetFileStatsLocalReturnInterface,
	GetFileStreamLocalOptionsInterface,
	GetFilesCursorLocalOptions,
	GetFilesCursorLocalReturnType,
	StorageLocalOptionsType,
	UploadFileLocalOptionsInterface,
	UploadFileLocalReturnInterface,
} from './local-storage.interface';

export type UploadReturnType = Upload | UploadFileLocalReturnInterface;

export type DeleteReturnType = DeleteObjectCommandOutput | boolean;

export type CopyReturnType = CopyObjectCommandOutput | string;
export type MoveReturnType = CopyReturnType;

export type GetFilesCursorReturnType =
	| GetFilesCursorLocalReturnType
	| Paginator<ListObjectsV2CommandOutput>;

export type GetFileStreamReturnType =
	| GetObjectCommandOutput
	| GetFileLocalReturnInterface;

export type GetFileStatsReturnType =
	| GetFileStatsLocalReturnInterface
	| HeadObjectOutput;

export type UploadFileOptionsType =
	| UploadFileLocalOptionsInterface
	| UploadS3FileOptionsInterface;

export type DeleteFileOptionsType = DeleteS3OptionsType;

export type DoesFileExistOptionsType = GetFileStatsS3OptionsType;

export type GetFilesCursorOptions =
	| GetFilesCursorLocalOptions
	| GetFilesCursorS3OptionsInterface;

export type CopyFileOptionsType = CopyFileS3OptionsType;
export type MoveFileOptionsType = MoveFileS3OptionsType;

export type GetFileStatsOptionsType =
	| GetFileStatsLocalOptionsType
	| GetFileStatsS3OptionsType;

export type GetFileStreamOptionsType =
	| GetFileStreamS3OptionsType
	| GetFileStreamLocalOptionsInterface;

export type GetOptionsType = AwsS3StorageOptionsType | StorageLocalOptionsType;

export interface CopyOrMoveInputInterface {
	from: string;
	to: string;
}

export interface GetFileInfoReturnType {
	file: FileType;
	fileName: string;
	fileType: FileTypeResult;
}

export interface GetFileInfoOptionsInterface
	extends Pick<UploadFileLocalOptionsInterface, 'generateUniqueFileName'> {}

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
	 * When ExtensionDetectionMethod is set to `ExtensionDetectionMethod.FROM_FILE_NAME`, this option determines whether to keep the original file extension.
	 * Keep in mind this requires to pass the file name to the upload method.
	 * When `ExtensionDetectionMethod.FROM_BUFFER` is used, it will guess the file extension from the buffer.
	 * however, this method may not work for all file types.
	 *
	 * @default ExtensionDetectionMethod.FROM_BUFFER
	 */
	extensionDetectionMethod?: ExtensionDetectionMethod;

	/**
	 * The file name. This is required when using `ExtensionDetectionMethod.FROM_FILE_NAME`.
	 * This won't be used for your uploaded file name. It will be used to determine the file extension.
	 */
	fileName?: string;
}
