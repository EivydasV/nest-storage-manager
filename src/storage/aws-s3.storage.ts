import {
	CopyObjectCommand,
	CopyObjectCommandOutput,
	DeleteObjectCommand,
	DeleteObjectCommandOutput,
	GetObjectCommand,
	GetObjectCommandOutput,
	HeadObjectCommand,
	HeadObjectCommandOutput,
	ListObjectsV2CommandOutput,
	S3Client,
	paginateListObjectsV2,
} from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { Paginator } from '@smithy/types/dist-types/pagination';
import { FileTypeResult } from 'file-type';
import {
	AwsS3StorageInterface,
	AwsS3StorageOptionsType,
	CopyFileS3OptionsType,
	CopyOrMoveInputInterface,
	DeleteS3OptionsType,
	DoesFileExistOptionsType,
	GetFileStatsS3OptionsType,
	GetFileStreamS3OptionsType,
	GetFilesCursorS3OptionsInterface,
	MoveFileS3OptionsType,
	UploadS3FileOptionsInterface,
} from '../interface';
import { FileType } from '../type';
import { AbstractStorage } from './abstract.storage';

export class AwsS3Storage extends AbstractStorage {
	private readonly s3Client: S3Client;

	constructor(private readonly awsS3StorageOptions: AwsS3StorageInterface) {
		super(awsS3StorageOptions);

		this.s3Client = new S3Client(awsS3StorageOptions.options);
	}

	public get client(): S3Client {
		return this.s3Client;
	}

	public get options(): AwsS3StorageOptionsType {
		return this.awsS3StorageOptions.options;
	}

	public async getFileStats(
		key: string,
		options?: GetFileStatsS3OptionsType,
	): Promise<HeadObjectCommandOutput> {
		const headObject = new HeadObjectCommand({
			...options,
			Bucket: this.options.Bucket,
			Key: key,
		});

		return await this.s3Client.send(headObject);
	}

	public async upload(
		file: FileType,
		options?: UploadS3FileOptionsInterface,
	): Promise<Upload> {
		const uploadOptions = {
			...AbstractStorage.defaultUploadOptions,
			...options,
		};

		const fileData = await this.getFileInfo(file, uploadOptions);

		return await this.createUpload(
			fileData.file,
			fileData.fileType,
			this.joinPath(
				this.generateSubDirectories(uploadOptions),
				fileData.fileName,
			),
		);
	}

	public uploadMany(
		files: FileType[],
		options?: UploadS3FileOptionsInterface,
	): Promise<PromiseSettledResult<Upload>[]> {
		const promises = files.map((file) => this.upload(file, options));

		return Promise.allSettled(promises);
	}

	private async createUpload(
		file: FileType,
		fileType: FileTypeResult,
		fullPath: string,
	): Promise<Upload> {
		const stream = await this.getReadStream(file);

		return new Upload({
			client: this.s3Client,
			params: {
				Bucket: this.options.Bucket,
				Key: fullPath,
				Body: stream,
				ContentType: fileType.mime,
			},
		});
	}

	public async delete(
		key: string,
		options?: DeleteS3OptionsType,
	): Promise<DeleteObjectCommandOutput> {
		const deleteCommand = new DeleteObjectCommand({
			...options,
			Bucket: this.options.Bucket,
			Key: key,
		});

		return await this.s3Client.send(deleteCommand);
	}

	public deleteMany(
		keys: string[],
		options?: DeleteS3OptionsType,
	): Promise<PromiseSettledResult<DeleteObjectCommandOutput>[]> {
		const promises = keys.map((key) => this.delete(key, options));

		return Promise.allSettled(promises);
	}

	public async doesFileExist(
		key: string,
		options?: DoesFileExistOptionsType,
	): Promise<boolean> {
		try {
			await this.getFileStats(key, options);

			return true;
		} catch (err) {
			return false;
		}
	}

	public async doesFileExistMany(
		keys: string[],
		options?: DoesFileExistOptionsType,
	): Promise<PromiseSettledResult<boolean>[]> {
		const promises = keys.map((key) => this.doesFileExist(key, options));

		return Promise.allSettled(promises);
	}

	public getFilesCursor(
		options?: GetFilesCursorS3OptionsInterface,
	): Paginator<ListObjectsV2CommandOutput> {
		return paginateListObjectsV2(
			{ ...options?.config, client: this.s3Client },
			{ ...options?.input, Bucket: this.options.Bucket },
		);
	}

	public async copy(
		{ to, from }: CopyOrMoveInputInterface,
		options?: CopyFileS3OptionsType,
	): Promise<CopyObjectCommandOutput> {
		const copyCommand = new CopyObjectCommand({
			...options,
			Bucket: this.options.Bucket,
			CopySource: this.joinPath(this.options.Bucket, from),
			Key: to,
		});

		return this.s3Client.send(copyCommand);
	}

	public async copyMany(
		inputs: CopyOrMoveInputInterface[],
		options?: CopyFileS3OptionsType,
	): Promise<PromiseSettledResult<CopyObjectCommandOutput>[]> {
		const promises = inputs.map((input) => this.copy(input, options));

		return Promise.allSettled(promises);
	}

	public async move(
		input: CopyOrMoveInputInterface,
		options?: MoveFileS3OptionsType,
	): Promise<CopyObjectCommandOutput> {
		const copy = await this.copy(input, options);
		await this.delete(input.from);

		return copy;
	}

	public async moveMany(
		inputs: CopyOrMoveInputInterface[],
		options?: MoveFileS3OptionsType,
	): Promise<PromiseSettledResult<CopyObjectCommandOutput>[]> {
		const promises = inputs.map((input) => this.move(input, options));

		return Promise.allSettled(promises);
	}

	public async getFile(
		key: string,
		options?: GetFileStreamS3OptionsType,
	): Promise<GetObjectCommandOutput> {
		const getObjectCommand = new GetObjectCommand({
			...options,
			Bucket: this.options.Bucket,
			Key: key,
		});

		return await this.s3Client.send(getObjectCommand);
	}
}
