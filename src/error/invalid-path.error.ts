import { FileManagerError } from './file-manager.error';

export class InvalidPathError extends FileManagerError {
	constructor(path: string, pathPrefix: string) {
		super(`Invalid path: ${path}. Path must start with "${pathPrefix}"`);
	}
}
