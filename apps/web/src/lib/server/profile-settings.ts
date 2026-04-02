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
		fanBio: String(formData.get('fanBio') ?? '').trim(),
		favoriteSportsMoment: String(formData.get('favoriteSportsMoment') ?? '').trim(),
		imageUrl: String(formData.get('imageUrl') ?? '').trim(),
		location: String(formData.get('location') ?? '').trim(),
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

type OptionalProfileTextParseResult =
	| {
			error: string
			value: null
	  }
	| {
			error: null
			value: string | null
	  }

function parseOptionalProfileText(input: {
	label: string
	maxLength: number
	minLength?: number
	value: string
}): OptionalProfileTextParseResult {
	if (!input.value) {
		return {
			error: null,
			value: null,
		}
	}

	if (input.minLength && input.value.length < input.minLength) {
		return {
			error: `${input.label} should be at least ${input.minLength} characters or left blank.`,
			value: null,
		}
	}

	if (input.value.length > input.maxLength) {
		return {
			error: `${input.label} should stay under ${input.maxLength} characters.`,
			value: null,
		}
	}

	return {
		error: null,
		value: input.value,
	}
}

export function parseLocationInput(location: string) {
	return parseOptionalProfileText({
		label: 'Location',
		maxLength: 80,
		minLength: 2,
		value: location,
	})
}

export function parseFanBioInput(fanBio: string) {
	return parseOptionalProfileText({
		label: 'Fan bio',
		maxLength: 160,
		minLength: 8,
		value: fanBio,
	})
}

export function parseFavoriteSportsMomentInput(favoriteSportsMoment: string) {
	return parseOptionalProfileText({
		label: 'Favorite sports moment',
		maxLength: 240,
		minLength: 12,
		value: favoriteSportsMoment,
	})
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
