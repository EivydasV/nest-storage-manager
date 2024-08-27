import { Injectable } from '@nestjs/common';
import { TransferFactory } from '../factory';
import {
	CopyFileManagerOptions,
	CopyFileManagerReturnType,
} from '../interface';
import { AbstractStorage } from '../storage';

@Injectable()
export class FileManager {
	constructor(private readonly transferFactory: TransferFactory) {}

	public async copy<
		SourceStorage extends AbstractStorage,
		DestinationStorage extends AbstractStorage,
	>(
		options: CopyFileManagerOptions<SourceStorage, DestinationStorage>,
	): Promise<CopyFileManagerReturnType<SourceStorage, DestinationStorage>> {
		return this.transferFactory.create(options);
	}

	public async move<
		SourceStorage extends AbstractStorage,
		DestinationStorage extends AbstractStorage,
	>(
		options: CopyFileManagerOptions<SourceStorage, DestinationStorage>,
	): Promise<CopyFileManagerReturnType<SourceStorage, DestinationStorage>> {
		const transfer = await this.transferFactory.create(options);
		await options.sourceStorage.delete(options.sourceFile);

		return transfer;
	}
}
