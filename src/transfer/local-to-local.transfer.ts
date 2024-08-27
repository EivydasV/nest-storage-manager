import { Injectable } from '@nestjs/common';
import { StorageEnum } from '../enum';
import { FsHelper } from '../helper';
import { CopyFileManagerOptions } from '../interface';
import { LocalStorage } from '../storage';
import { AbstractTransfer } from './abstract.transfer';

@Injectable()
export class LocalToLocalTransfer extends AbstractTransfer<
	CopyFileManagerOptions<LocalStorage, LocalStorage>,
	string
> {
	constructor(private readonly fsHelper: FsHelper) {
		super(StorageEnum.LOCAL);
	}

	async transfer({
		sourceFile,
		sourceStorage,
		destinationStorage,
	}: CopyFileManagerOptions<LocalStorage, LocalStorage>): Promise<string> {
		const from = sourceStorage.getSafePath(sourceFile);
		const to = destinationStorage.getSafePath(sourceFile);

		await this.fsHelper.checkIfFileExists(from);

		await this.fsHelper.copy(from, to);

		return sourceFile;
	}
}
