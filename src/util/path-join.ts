import * as path from 'node:path';
import { StorageEnum } from '../enum';

export const pathJoin = (ctx: StorageEnum, ...paths: string[]): string => {
	if (ctx === StorageEnum.LOCAL) {
		return path.join(...paths);
	}

	return path.posix.join(...paths);
};
