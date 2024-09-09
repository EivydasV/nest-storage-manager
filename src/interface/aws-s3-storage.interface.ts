import {
	CopyObjectCommandInput,
	GetObjectCommandInput,
	HeadObjectCommandInput,
	ListObjectsV2CommandInput,
	S3ClientConfig,
	S3PaginationConfiguration,
} from '@aws-sdk/client-s3';
import { Options } from '@aws-sdk/lib-storage';
import { DeepOmit } from 'ts-essentials';
import { StorageEnum } from '../enum';
import { UploadFileOptionsInterface } from './abstract-storage.interface';
import { UploadFileLocalOptionsInterface } from './local-storage.interface';
import { BaseStorageOptionsInterface } from './storage-module-options.interface';

export type AwsS3StorageOptionsType = S3ClientConfig & { Bucket: string };

/**
 * Interface for configuring aws s3 storage options.
 */
export interface AwsS3StorageInterface
	extends BaseStorageOptionsInterface<StorageEnum.AWS_S3> {
	options: AwsS3StorageOptionsType;
}

export type S3UploadOptionsType = Partial<
	DeepOmit<
		Options,
		{
			client: never;
			params: {
				Bucket: never;
				Key: never;
				Body: never;
			};
		}
	>
>;

export interface UploadS3FileOptionsInterface
	extends UploadFileOptionsInterface,
		S3UploadOptionsType {}

export type DeleteS3OptionsType = Omit<S3UploadOptionsType, 'Bucket' | 'Key'>;

export interface GetFilesCursorS3OptionsInterface {
	config?: Omit<S3PaginationConfiguration, 'client'>;
	input?: Omit<ListObjectsV2CommandInput, 'Bucket'>;
}

export type CopyFileS3OptionsType = Omit<
	CopyObjectCommandInput,
	'Key' | 'Bucket' | 'CopySource'
>;

export type MoveFileS3OptionsType = Omit<
	CopyObjectCommandInput,
	'Key' | 'Bucket' | 'CopySource'
>;

export type GetFileStatsS3OptionsType = Omit<
	HeadObjectCommandInput,
	'Key' | 'Bucket'
>;

export type GetFileStreamS3OptionsType = Omit<
	GetObjectCommandInput,
	'Key' | 'Bucket'
>;
