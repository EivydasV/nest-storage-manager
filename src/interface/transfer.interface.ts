export interface TransferInterface<TInput, TOutput> {
	transfer(options: TInput): Promise<TOutput>;
}
