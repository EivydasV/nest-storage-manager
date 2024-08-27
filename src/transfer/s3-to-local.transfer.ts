import { Readable } from 'node:stream';
import { Injectable } from '@nestjs/common';
import { StorageEnum } from '../enum';
import {
	CopyFileManagerOptions,
	UploadFileLocalReturnInterface,
} from '../interface';
import { AwsS3Storage, LocalStorage } from '../storage';
import { AbstractTransfer } from './abstract.transfer';

@Injectable()
export class S3ToLocalTransfer extends AbstractTransfer<
	CopyFileManagerOptions<AwsS3Storage, LocalStorage>,
	UploadFileLocalReturnInterface
> {
	constructor() {
		super(StorageEnum.LOCAL);
	}

	public async transfer({
		sourceFile,
		sourceStorage,
		destinationStorage,
	}: CopyFileManagerOptions<
		AwsS3Storage,
		LocalStorage
	>): Promise<UploadFileLocalReturnInterface> {
		const getFileStream = await sourceStorage.getFile(sourceFile);
		if (!(getFileStream.Body instanceof Readable)) {
			throw new Error(`"${sourceFile}" is not a readable stream`);
		}

		return await destinationStorage.upload(getFileStream.Body, {
			generateSubDirectories: () => this.preserveSubDirectories(sourceFile),
			generateUniqueFileName: () => this.preserveFileName(sourceFile),
		});
	}
}
