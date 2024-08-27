import { CopyObjectCommand, CopyObjectCommandOutput } from '@aws-sdk/client-s3';
import { Injectable } from '@nestjs/common';
import { StorageEnum } from '../enum';
import { CopyFileManagerOptions } from '../interface';
import { AwsS3Storage } from '../storage';
import { pathJoin } from '../util';
import { AbstractTransfer } from './abstract.transfer';

@Injectable()
export class S3ToS3Transfer extends AbstractTransfer<
	CopyFileManagerOptions<AwsS3Storage, AwsS3Storage>,
	CopyObjectCommandOutput
> {
	constructor() {
		super(StorageEnum.AWS_S3);
	}

	async transfer({
		sourceFile,
		sourceStorage,
		destinationStorage,
	}: CopyFileManagerOptions<
		AwsS3Storage,
		AwsS3Storage
	>): Promise<CopyObjectCommandOutput> {
		const copyCommand = new CopyObjectCommand({
			Bucket: destinationStorage.options.Bucket,
			CopySource: pathJoin(
				StorageEnum.AWS_S3,
				sourceStorage.options.Bucket,
				sourceFile,
			),
			Key: sourceFile,
		});

		return await destinationStorage.client.send(copyCommand);
	}
}
