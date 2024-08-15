import {
	CopyObjectCommandOutput,
	DeleteObjectCommandOutput,
	GetObjectCommandOutput,
	HeadObjectOutput,
	ListObjectsV2CommandOutput,
} from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { Paginator } from '@smithy/types/dist-types/pagination';
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
	GetFileStatsLocalOptionsType,
	GetFileStatsLocalReturnInterface,
	GetFileStreamLocalOptionsInterface,
	GetFileStreamLocalReturnInterface,
	GetFilesCursorLocalOptions,
	GetFilesCursorLocalReturnType,
	StorageLocalOptionsType,
	UploadFileLocalOptionsInterface,
} from './local-storage.interface';

export type UploadReturnType = Upload | string;

export type DeleteReturnType = DeleteObjectCommandOutput | boolean;

export type CopyReturnType = CopyObjectCommandOutput | string;
export type MoveReturnType = CopyReturnType;

export type GetFilesCursorReturnType =
	| GetFilesCursorLocalReturnType
	| Paginator<ListObjectsV2CommandOutput>;

export type GetFileStreamReturnType =
	| GetObjectCommandOutput
	| GetFileStreamLocalReturnInterface;

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
