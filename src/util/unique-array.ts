export const uniqueArray = (array: unknown[]) => {
	const checkSet = new Set(array);

	return checkSet.size === array.length;
};
