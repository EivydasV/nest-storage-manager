import { FileManagerError } from './file-manager.error';

export class FileDoesNotExistError extends FileManagerError {
	constructor(path: string) {
		super(`File does not exist: ${path}`);
	}
}
