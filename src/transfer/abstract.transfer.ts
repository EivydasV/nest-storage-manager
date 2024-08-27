import * as path from 'node:path';
import { StorageEnum } from '../enum';
import { StorageLocalOptionsType } from '../interface';
import { pathJoin } from '../util';

export abstract class AbstractTransfer<TInput, TOutput> {
	protected constructor(private readonly storageEnum: StorageEnum) {}

	protected abstract transfer(options: TInput): Promise<TOutput>;

	protected preserveSubDirectories(
		filePath: string,
		options?: StorageLocalOptionsType,
	): string {
		const dir = path.dirname(filePath);
		const parts = dir.split(path.sep);

		const newParts = parts.filter((part) => part !== options?.bucket);

		return pathJoin(this.storageEnum, ...newParts);
	}

	protected preserveFileName(filePath: string): string {
		return path.basename(filePath);
	}
}
