import { FileManagerError } from './file-manager.error';

export class InvalidPathError extends FileManagerError {
	constructor(path: string) {
		super(`Invalid path: ${path}`);
	}
}
