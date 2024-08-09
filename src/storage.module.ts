import { DynamicModule, Module, Provider } from '@nestjs/common';
import { StorageFactory } from './factory';
import { StorageProviders, UploadModuleOptionsType } from './interface';
import { uniqueArray } from './util/unique-array';

@Module({})
export class StorageModule {
	public static register(options: UploadModuleOptionsType): DynamicModule {
		const uploaderModuleOptions = Array.isArray(options)
			? options
			: options.storages;

		StorageModule.validateNames(uploaderModuleOptions.map(({ name }) => name));

		const providers = StorageModule.createProviders(uploaderModuleOptions);

		return {
			module: StorageModule,
			providers: providers,
			exports: providers,
			global: !Array.isArray(options) && options.isGlobal,
		};
	}

	private static createProviders(
		uploaderModuleOptions: StorageProviders[],
	): Provider[] {
		return uploaderModuleOptions.map((uploaderModuleOption) => {
			return {
				provide: uploaderModuleOption.name,
				useValue: StorageFactory.create(
					uploaderModuleOption.storage,
					uploaderModuleOption,
				),
			};
		});
	}

	private static validateNames(names: (string | symbol)[]): void {
		if (!uniqueArray(names)) {
			throw new Error('Duplicate names');
		}
	}
}
