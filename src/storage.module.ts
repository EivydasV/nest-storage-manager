import { DynamicModule, Module, Provider } from '@nestjs/common';
import { StorageFactory } from './factory';
import {
	StorageModuleAsyncOptionsType,
	StorageModuleOptionsFactory,
	StorageModuleOptionsType,
	StorageProviderOptionsType,
	StoragesProviderAsyncOptions,
} from './interface';
import { uniqueArray } from './util/unique-array';

@Module({})
export class StorageModule {
	public static register(options: StorageModuleOptionsType): DynamicModule {
		const uploaderModuleOptions = Array.isArray(options)
			? options
			: options.storages;

		const providers = StorageModule.createStorageProviders(
			uploaderModuleOptions,
		);

		return {
			module: StorageModule,
			providers: providers,
			exports: providers,
			global: !Array.isArray(options) && options.isGlobal,
		};
	}

	public static async registerAsync(
		options: StorageModuleAsyncOptionsType,
	): Promise<DynamicModule> {
		const storageModuleOptions = Array.isArray(options)
			? options
			: options.storages;

		StorageModule.validateNames(storageModuleOptions.map(({ name }) => name));

		const providers: Provider[] = storageModuleOptions.reduce(
			(accProviders: Provider[], item) =>
				accProviders.concat(this.createAsyncProviders(item)),
			[],
		);

		const imports = storageModuleOptions.reduce(
			// biome-ignore lint/suspicious/noExplicitAny: <explanation>
			(accImports: any[], option) =>
				option.imports && !accImports.includes(option.imports)
					? accImports.concat(option.imports)
					: accImports,
			[],
		);

		return {
			module: StorageModule,
			global: !Array.isArray(options) && options.isGlobal,
			imports,
			providers: providers,
			exports: providers,
		};
	}

	private static createAsyncProviders(
		options: StoragesProviderAsyncOptions,
	): Provider[] {
		if (options.useExisting || options.useFactory) {
			return [this.createAsyncOptionsProvider(options)];
		}

		return [
			this.createAsyncOptionsProvider(options),
			{
				// biome-ignore lint/style/noNonNullAssertion: <explanation>
				provide: options.useClass!,
				// biome-ignore lint/style/noNonNullAssertion: <explanation>
				useClass: options.useClass!,
			},
		];
	}

	private static createAsyncOptionsProvider(
		options: StoragesProviderAsyncOptions,
	): Provider {
		if (options.useFactory) {
			return {
				provide: options.name,
				useFactory: this.createFactoryWrapper(options.useFactory),
				inject: options.inject || [],
			};
		}

		return {
			provide: options.name,
			useFactory: this.createFactoryWrapper(
				(optionsFactory: StorageModuleOptionsFactory) =>
					optionsFactory.createClientOptions(),
			),
			// biome-ignore lint/style/noNonNullAssertion: <explanation>
			inject: [options.useExisting! || options.useClass!],
		};
	}

	private static createFactoryWrapper(
		useFactory: StoragesProviderAsyncOptions['useFactory'],
	) {
		return async (...args: unknown[]) => {
			// biome-ignore lint/style/noNonNullAssertion: <explanation>
			const clientOptions = await useFactory!(...args);

			return StorageFactory.create(clientOptions);
		};
	}

	private static createStorageProviders(
		uploaderModuleOptions: StorageProviderOptionsType[],
	): Provider[] {
		StorageModule.validateNames(uploaderModuleOptions.map(({ name }) => name));

		return uploaderModuleOptions.map((uploaderModuleOption) => {
			return {
				provide: uploaderModuleOption.name,
				useValue: StorageFactory.create(uploaderModuleOption),
			};
		});
	}

	private static validateNames(names: (string | symbol)[]): void {
		if (!uniqueArray(names)) {
			throw new Error('Duplicate names');
		}
	}
}
