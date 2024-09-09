import { Transform, TransformCallback, TransformOptions } from 'node:stream';

export class AppendStream extends Transform {
	private appended: boolean;
	constructor(
		private readonly appendData: Buffer,
		opts?: TransformOptions,
	) {
		super(opts);
		this.appendData = appendData;
		this.appended = false;
	}

	_transform(chunk: unknown, encoding: BufferEncoding, cb: TransformCallback) {
		if (!this.appended) {
			this.push(this.appendData);
			this.appended = true;
		}
		this.push(chunk);

		cb();
	}
}
