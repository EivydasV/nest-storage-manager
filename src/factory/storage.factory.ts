import { StorageEnum } from '../enum';
import { FsHelper } from '../helper';
import { LocalStorageOptionsInterface } from '../interface';
import { StorageProviders } from '../interface';
import { AbstractStorage } from '../storage';
import { LocalStorage } from '../storage';

export class StorageFactory {
	public static create(
		storage: StorageEnum,
		uploaderModuleOption: StorageProviders,
	): AbstractStorage {
		switch (storage) {
			case StorageEnum.LOCAL:
				return new LocalStorage(
					uploaderModuleOption as LocalStorageOptionsInterface,
					new FsHelper(),
				);
			default:
				throw new Error(`Storage "${storage}" not supported`);
		}
	}
}
