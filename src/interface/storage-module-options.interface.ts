import { ModuleMetadata, Provider, Type } from '@nestjs/common';
import { StorageEnum } from '../enum';
import { AwsS3StorageInterface } from './aws-s3-storage.interface';
import { StorageOptionsLocalInterface } from './local-storage.interface';

export type StorageProvidersType =
	| StorageOptionsLocalInterface
	| AwsS3StorageInterface;

export type StorageProviderOptionsType = StorageProvidersType & {
	/**
	 * The name is injection token. It is used to inject the storage into the constructor.
	 * @example constructor(@Inject(STORAGE_NAME) private readonly storage: LocalStorage) {}
	 */
	name: string | symbol;
};

export type StorageModuleOptionsType =
	| StorageProviderOptionsType[]
	| {
			/**
			 * An array of storage providers.
			 */
			storages: StorageProviderOptionsType[];

			/**
			 * Determines whether the storage services are global.
			 * @default false
			 */
			isGlobal?: boolean;
	  };

export type StorageModuleAsyncOptionsType =
	| StoragesProviderAsyncOptions[]
	| {
			/**
			 * An array of storage providers.
			 */
			storages: StoragesProviderAsyncOptions[];

			/**
			 * Determines whether the storage services are global.
			 * @default false
			 */
			isGlobal?: boolean;
	  };

export interface BaseStorageOptionsInterface<Storage extends StorageEnum> {
	/**
	 * The storage type.
	 */
	storage: Storage;
}

export interface StorageModuleOptionsFactory {
	createClientOptions(): Promise<StorageProvidersType> | StorageProvidersType;
}

export interface StoragesProviderAsyncOptions
	extends Pick<ModuleMetadata, 'imports'> {
	useExisting?: Type<StorageModuleOptionsFactory>;
	useClass?: Type<StorageModuleOptionsFactory>;
	useFactory?: (
		...args: unknown[]
	) => Promise<StorageProvidersType> | StorageProvidersType;
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	inject?: any[];
	name: string | symbol;
}
