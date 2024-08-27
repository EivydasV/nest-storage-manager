import { CompleteMultipartUploadCommandOutput } from '@aws-sdk/client-s3';
import { Injectable } from '@nestjs/common';
import { StorageEnum } from '../enum';
import { CopyFileManagerOptions } from '../interface';
import { AwsS3Storage, LocalStorage } from '../storage';
import { AbstractTransfer } from './abstract.transfer';

@Injectable()
export class LocalToS3Transfer extends AbstractTransfer<
	CopyFileManagerOptions<LocalStorage, AwsS3Storage>,
	CompleteMultipartUploadCommandOutput
> {
	constructor() {
		super(StorageEnum.AWS_S3);
	}

	async transfer({
		sourceFile,
		sourceStorage,
		destinationStorage,
	}: CopyFileManagerOptions<
		LocalStorage,
		AwsS3Storage
	>): Promise<CompleteMultipartUploadCommandOutput> {
		const file = await sourceStorage.getFile(sourceFile);

		const upload = await destinationStorage.upload(file.stream, {
			generateSubDirectories: () =>
				this.preserveSubDirectories(sourceFile, sourceStorage.options),
			generateUniqueFileName: () => this.preserveFileName(sourceFile),
		});

		return await upload.done();
	}
}
