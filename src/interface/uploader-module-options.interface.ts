import { StorageEnum } from '../enum';
import { LocalStorageOptionsInterface } from './local-storage.interface';

export type StorageProviders = LocalStorageOptionsInterface;

export type UploadModuleOptionsType =
	| StorageProviders[]
	| {
			/**
			 * An array of storage providers.
			 */
			storages: StorageProviders[];

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

	/**
	 * The name is injection token. It is used to inject the storage into the constructor.
	 * @example constructor(@Inject(STORAGE_NAME) private readonly storage: LocalStorage) {}
	 */
	name: string;
}
