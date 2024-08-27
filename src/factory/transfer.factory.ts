import { Injectable } from '@nestjs/common';
import {
	CopyFileManagerOptions,
	CopyFileManagerReturnType,
} from '../interface';
import { AbstractStorage, AwsS3Storage, LocalStorage } from '../storage';
import { LocalToS3Transfer } from '../transfer';
import { LocalToLocalTransfer } from '../transfer/local-to-local.transfer';
import { S3ToLocalTransfer } from '../transfer/s3-to-local.transfer';
import { S3ToS3Transfer } from '../transfer/s3-to-s3.transfer';

@Injectable()
export class TransferFactory {
	constructor(
		private readonly localToLocalTransfer: LocalToLocalTransfer,
		private readonly localToS3Transfer: LocalToS3Transfer,
		private readonly s3ToLocalTransfer: S3ToLocalTransfer,
		private readonly s3ToS3Transfer: S3ToS3Transfer,
	) {}

	public async create<
		SourceStorage extends AbstractStorage,
		DestinationStorage extends AbstractStorage,
	>(
		options: CopyFileManagerOptions,
	): Promise<CopyFileManagerReturnType<SourceStorage, DestinationStorage>> {
		const { sourceStorage, destinationStorage } = options;

		if (
			sourceStorage instanceof LocalStorage &&
			destinationStorage instanceof LocalStorage
		) {
			return (await this.localToLocalTransfer.transfer(
				options as CopyFileManagerOptions<LocalStorage, LocalStorage>,
			)) as CopyFileManagerReturnType<SourceStorage, DestinationStorage>;
		}
		if (
			sourceStorage instanceof LocalStorage &&
			destinationStorage instanceof AwsS3Storage
		) {
			return (await this.localToS3Transfer.transfer(
				options as CopyFileManagerOptions<LocalStorage, AwsS3Storage>,
			)) as CopyFileManagerReturnType<SourceStorage, DestinationStorage>;
		}
		if (
			sourceStorage instanceof AwsS3Storage &&
			destinationStorage instanceof LocalStorage
		) {
			return (await this.s3ToLocalTransfer.transfer(
				options as CopyFileManagerOptions<AwsS3Storage, LocalStorage>,
			)) as CopyFileManagerReturnType<SourceStorage, DestinationStorage>;
		}
		if (
			sourceStorage instanceof AwsS3Storage &&
			destinationStorage instanceof AwsS3Storage
		) {
			return (await this.s3ToS3Transfer.transfer(
				options as CopyFileManagerOptions<AwsS3Storage, AwsS3Storage>,
			)) as CopyFileManagerReturnType<SourceStorage, DestinationStorage>;
		}

		throw new Error(
			`cannot transfer between "${sourceStorage}" and "${destinationStorage}" storages`,
		);
	}
}
