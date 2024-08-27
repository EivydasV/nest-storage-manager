import {
	CompleteMultipartUploadCommandOutput,
	CopyObjectCommandOutput,
} from '@aws-sdk/client-s3';
import { AbstractStorage, AwsS3Storage, LocalStorage } from '../storage';
import { UploadFileLocalReturnInterface } from './local-storage.interface';

export interface CopyFileManagerOptions<
	SourceStorage extends AbstractStorage = AbstractStorage,
	DestinationStorage extends AbstractStorage = AbstractStorage,
> {
	/**
	 * The source storage.
	 */
	sourceStorage: SourceStorage;

	/**
	 * The destination storage.
	 */
	destinationStorage: DestinationStorage;

	/**
	 * The source file. Key.
	 */
	sourceFile: string;
}

export type CopyFileManagerReturnType<
	TSource extends AbstractStorage,
	TDest extends AbstractStorage,
> = TSource extends LocalStorage
	? TDest extends LocalStorage
		? string
		: CompleteMultipartUploadCommandOutput
	: TSource extends AwsS3Storage
		? TDest extends LocalStorage
			? UploadFileLocalReturnInterface
			: CopyObjectCommandOutput
		: never;
