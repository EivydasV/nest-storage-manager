import { FileManagerError } from './file-manager.error';

export class FileTypeError extends FileManagerError {
	constructor(message?: string) {
		super(message || 'Could not guess file type. File may be corrupted.');
	}
}
