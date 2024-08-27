import * as fs from 'node:fs';
import * as fsPromises from 'node:fs/promises';
import * as path from 'node:path';
import { Injectable } from '@nestjs/common';
import { FileDoesNotExistError } from '../error';
import { FileManagerError } from '../error';
import { GetFileStatsLocalOptionsType } from '../interface';

@Injectable()
export class FsHelper {
	public async checkIfFileExists(filePath: string): Promise<void> {
		try {
			const stats = await fsPromises.stat(filePath);
			if (!stats.isFile()) {
				throw new Error(`"${filePath}" is not a file`);
			}
		} catch (err) {
			throw new FileDoesNotExistError(filePath);
		}
	}

	public async delete(filePath: string): Promise<void> {
		try {
			await fsPromises.unlink(filePath);
		} catch (err) {
			throw new FileManagerError(err);
		}
	}

	public async copy(fromPath: string, toPath: string): Promise<void> {
		try {
			await this.makeDir(path.dirname(toPath), {
				recursive: true,
			});
			await fsPromises.copyFile(fromPath, toPath);
		} catch (err) {
			throw new FileManagerError(err);
		}
	}

	public async move(fromPath: string, toPath: string): Promise<void> {
		try {
			await this.makeDir(path.dirname(toPath), {
				recursive: true,
			});
			await fsPromises.rename(fromPath, toPath);
		} catch (err) {
			throw new FileManagerError(err);
		}
	}

	public async makeDir(
		path: string,
		options?: fs.MakeDirectoryOptions,
	): Promise<void> {
		try {
			await fsPromises.mkdir(path, options);
		} catch (err) {
			throw new FileManagerError(err);
		}
	}

	public async openDir(
		path: string,
		options?: fs.OpenDirOptions,
	): Promise<fs.Dir> {
		try {
			return await fsPromises.opendir(path, options);
		} catch (err) {
			throw new FileManagerError(err);
		}
	}

	public async stats(
		path: string,
		options?: GetFileStatsLocalOptionsType,
	): Promise<fs.Stats> {
		try {
			return await fsPromises.stat(path, options);
		} catch (err) {
			throw new FileManagerError(err);
		}
	}
}
