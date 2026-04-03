import postgres from 'postgres'

type Alert = {
	key: string
	message: string
	severity: 'critical' | 'warning'
	threshold: number
	value: number
}

type CountRow = {
	failures?: number | string
	planBlocks?: number | string
	total?: number | string
	zeroResults?: number | string
}

function readNumberEnv(name: string, fallback: number) {
	const rawValue = process.env[name]

	if (!rawValue) {
		return fallback
	}

	const parsedValue = Number(rawValue)

	return Number.isFinite(parsedValue) ? parsedValue : fallback
}

function toNumber(value: number | string | undefined) {
	if (typeof value === 'number') {
		return value
	}

	if (typeof value === 'string') {
		const parsedValue = Number(value)
		return Number.isFinite(parsedValue) ? parsedValue : 0
	}

	return 0
}

function formatPercent(value: number) {
	return `${(value * 100).toFixed(1)}%`
}

async function sendAlertWebhook(input: { alerts: Alert[]; text: string; url: string }) {
	const response = await fetch(input.url, {
		body: JSON.stringify({
			alerts: input.alerts,
			text: input.text,
		}),
		headers: {
			'content-type': 'application/json',
		},
		method: 'POST',
	})

	if (!response.ok) {
		throw new Error(`Alert webhook failed with status ${response.status}.`)
	}
}

const windowMinutes = readNumberEnv('OPS_ALERT_WINDOW_MINUTES', 10)
const minSampleSize = readNumberEnv('OPS_MIN_SAMPLE_SIZE', 5)
const aiFailureRateThreshold = readNumberEnv('OPS_AI_FAILURE_RATE_THRESHOLD', 0.1)
const searchZeroRateThreshold = readNumberEnv('OPS_SEARCH_ZERO_RATE_THRESHOLD', 0.4)
const billingFailureThreshold = readNumberEnv('OPS_BILLING_FAILURE_THRESHOLD', 3)
const planBlockThreshold = readNumberEnv('OPS_PLAN_BLOCK_THRESHOLD', 10)
const webhookUrl = process.env.OPS_ALERT_WEBHOOK_URL
const databaseUrl =
	process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/larry'
const since = new Date(Date.now() - windowMinutes * 60 * 1000)
const sql = postgres(databaseUrl, { max: 1 })

try {
	const [aiRows, searchRows, billingRows, planBlockRows] = await Promise.all([
		sql<CountRow[]>`
			SELECT
				COUNT(*)::int AS total,
				COUNT(*) FILTER (
					WHERE payload ? 'errorMessage'
						OR COALESCE((payload->>'fallback')::boolean, false)
				)::int AS failures
			FROM provider_event
			WHERE provider_kind = 'model'
				AND created_at >= ${since}
				AND provider_name <> 'safety'
		`,
		sql<CountRow[]>`
			WITH recent_queries AS (
				SELECT id
				FROM search_query
				WHERE requested_at >= ${since}
			),
			result_counts AS (
				SELECT q.id, COUNT(r.id)::int AS result_count
				FROM recent_queries q
				LEFT JOIN search_result r ON r.search_query_id = q.id
				GROUP BY q.id
			)
			SELECT
				COUNT(*)::int AS total,
				COUNT(*) FILTER (WHERE result_count = 0)::int AS zero_results
			FROM result_counts
		`,
		sql<CountRow[]>`
			SELECT COUNT(*)::int AS failures
			FROM provider_event
			WHERE provider_kind = 'billing'
				AND created_at >= ${since}
				AND payload->>'status' = 'failure'
		`,
		sql<CountRow[]>`
			SELECT COUNT(*)::int AS plan_blocks
			FROM provider_event
			WHERE provider_kind = 'billing'
				AND provider_name = 'plan-enforcement'
				AND created_at >= ${since}
		`,
	])

	const aiTotal = toNumber(aiRows[0]?.total)
	const aiFailures = toNumber(aiRows[0]?.failures)
	const aiFailureRate = aiTotal > 0 ? aiFailures / aiTotal : 0
	const searchTotal = toNumber(searchRows[0]?.total)
	const searchZeroResults = toNumber(searchRows[0]?.zeroResults)
	const searchZeroRate = searchTotal > 0 ? searchZeroResults / searchTotal : 0
	const billingFailures = toNumber(billingRows[0]?.failures)
	const planBlocks = toNumber(planBlockRows[0]?.planBlocks)

	const alerts: Alert[] = []

	if (aiTotal >= minSampleSize && aiFailureRate > aiFailureRateThreshold) {
		alerts.push({
			key: 'ai-failure-rate',
			message: `AI failure rate is ${formatPercent(aiFailureRate)} over the last ${windowMinutes} minutes.`,
			severity: 'critical',
			threshold: aiFailureRateThreshold,
			value: aiFailureRate,
		})
	}

	if (searchTotal >= minSampleSize && searchZeroRate > searchZeroRateThreshold) {
		alerts.push({
			key: 'search-zero-rate',
			message: `Search zero-result rate is ${formatPercent(searchZeroRate)} over the last ${windowMinutes} minutes.`,
			severity: 'warning',
			threshold: searchZeroRateThreshold,
			value: searchZeroRate,
		})
	}

	if (billingFailures >= billingFailureThreshold) {
		alerts.push({
			key: 'billing-failures',
			message: `${billingFailures} billing failures landed over the last ${windowMinutes} minutes.`,
			severity: 'critical',
			threshold: billingFailureThreshold,
			value: billingFailures,
		})
	}

	if (planBlocks >= planBlockThreshold) {
		alerts.push({
			key: 'plan-block-spike',
			message: `${planBlocks} hard plan-enforcement blocks fired over the last ${windowMinutes} minutes.`,
			severity: 'warning',
			threshold: planBlockThreshold,
			value: planBlocks,
		})
	}

	const summaryLines = [
		`Ops alert window: last ${windowMinutes} minutes`,
		`AI failures: ${aiFailures}/${aiTotal} (${formatPercent(aiFailureRate)})`,
		`Search zero-result rate: ${searchZeroResults}/${searchTotal} (${formatPercent(searchZeroRate)})`,
		`Billing failures: ${billingFailures}`,
		`Plan-enforcement blocks: ${planBlocks}`,
	]

	console.log(summaryLines.join('\n'))

	if (alerts.length === 0) {
		console.log('No alert thresholds crossed.')
	} else {
		const alertText = [
			'Larry hosted ops alert',
			...alerts.map((alert) => `- ${alert.message}`),
		].join('\n')

		console.error(alertText)

		if (webhookUrl) {
			await sendAlertWebhook({
				alerts,
				text: alertText,
				url: webhookUrl,
			})
		}

		process.exitCode = 1
	}
} finally {
	await sql.end({ timeout: 5 })
}
