import { StorageEnum } from '../enum';
import { FsHelper } from '../helper';
import {
	AwsS3StorageInterface,
	StorageOptionsLocalInterface,
} from '../interface';
import { StorageProvidersType } from '../interface';
import { AbstractStorage } from '../storage';
import { LocalStorage } from '../storage';
import { AwsS3Storage } from '../storage/aws-s3.storage';

export class StorageFactory {
	public static create(
		storageModuleOption: StorageProvidersType,
	): AbstractStorage {
		switch (storageModuleOption.storage) {
			case StorageEnum.LOCAL:
				return new LocalStorage(
					storageModuleOption as StorageOptionsLocalInterface,
					new FsHelper(),
				);
			case StorageEnum.AWS_S3:
				return new AwsS3Storage(storageModuleOption as AwsS3StorageInterface);
			default:
				throw new Error(`Storage "${storageModuleOption}" not supported`);
		}
	}
}
