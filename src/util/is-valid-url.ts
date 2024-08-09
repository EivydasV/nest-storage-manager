export const isValidURL = (url: string): boolean => {
	try {
		new URL(url);

		return true;
	} catch (error) {
		return false;
	}
};
