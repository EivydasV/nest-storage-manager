import { FileManagerError } from './file-manager.error';

export class FileDownloadError extends FileManagerError {
	constructor(message: string) {
		super(message || 'Could not download file');
	}
}
