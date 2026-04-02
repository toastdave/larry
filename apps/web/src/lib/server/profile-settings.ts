type DisplayNameParseResult =
	| {
			error: string
			value: null
	  }
	| {
			error: null
			value: string
	  }

export function readProfileFormValues(formData: FormData) {
	return {
		displayName: String(formData.get('displayName') ?? '').trim(),
		imageUrl: String(formData.get('imageUrl') ?? '').trim(),
	}
}

export function parseDisplayNameInput(displayName: string): DisplayNameParseResult {
	if (displayName.length < 2) {
		return {
			error: 'Use at least 2 characters so Larry has something to call you.',
			value: null,
		}
	}

	if (displayName.length > 60) {
		return {
			error: 'Keep the display name under 60 characters.',
			value: null,
		}
	}

	return {
		error: null,
		value: displayName,
	}
}

type ImageUrlParseResult =
	| {
			error: string
			value: null
	  }
	| {
			error: null
			value: string | null
	  }

export function parseProfileImageInput(imageUrl: string): ImageUrlParseResult {
	if (!imageUrl) {
		return {
			error: null,
			value: null,
		}
	}

	try {
		const url = new URL(imageUrl)

		if (url.protocol !== 'http:' && url.protocol !== 'https:') {
			return {
				error: 'Use an http or https image URL.',
				value: null,
			}
		}

		return {
			error: null,
			value: url.toString(),
		}
	} catch {
		return {
			error: 'Use a valid image URL or leave it blank.',
			value: null,
		}
	}
}
