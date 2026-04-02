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
