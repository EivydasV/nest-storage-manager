import { StorageEnum } from '../enum';
import { FsHelper } from '../helper';
import { LocalStorageOptionsInterface } from '../interface';
import { StorageProvidersType } from '../interface';
import { AbstractStorage } from '../storage';
import { LocalStorage } from '../storage';

export class StorageFactory {
	public static create(
		storageModuleOption: StorageProvidersType,
	): AbstractStorage {
		switch (storageModuleOption.storage) {
			case StorageEnum.LOCAL:
				return new LocalStorage(
					storageModuleOption as LocalStorageOptionsInterface,
					new FsHelper(),
				);
			default:
				throw new Error(
					`Storage "${storageModuleOption.storage}" not supported`,
				);
		}
	}
}
