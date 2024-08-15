export const isValidURL = (url: unknown): url is string => {
	if (typeof url !== 'string') {
		return false;
	}

	try {
		new URL(url);

		return true;
	} catch (error) {
		return false;
	}
};
