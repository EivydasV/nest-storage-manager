export const importESM = async <T>(name: string): Promise<T> => {
	// biome-ignore lint/encryptor/noGlobalEval: <workaround for importing esm modules in commonjs>
	return eval('import(name)') as Promise<T>;
};
