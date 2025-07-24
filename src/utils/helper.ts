/**
 * Logs a formatted message with a specified severity to stderr.
 *
 * The MCP server uses stdio transport, so using console.log might interfere with the transport.
 * Therefore, logging messages are written to stderr.
 *
 * @param {'info' | 'error'} severity - The severity level of the log message.
 * @param {...any[]} args - Additional arguments to be logged, which will be concatenated into a single string.
 */
export function log(
  severity: 'info' | 'error',
  ...args: any[] // eslint-disable-line @typescript-eslint/no-explicit-any
) {
  const msg = `[${severity.toUpperCase()} ${new Date().toISOString()}] ${args.join(' ')}\n`
  process.stderr.write(msg)
}

export { version as mcpDatadogVersion } from '../../package.json'

export function unreachable(value: never): never {
  throw new Error(`Unreachable code: ${value}`)
}

/**
 * Parses a Datadog metrics query string and extracts the metric name and tags.
 * Example query: 'avg:system.cpu.user{env:prod,host:web-01}'
 * Returns: { metric: 'system.cpu.user', tags: ['env:prod', 'host:web-01'] }
 */
export function parseMetricQuery(query: string): {
  metric: string | null
  tags: string[]
} {
  // Remove any function prefix (e.g., avg:) if present
  let metricAndTags = query
  const colonIdx = query.indexOf(':')
  if (colonIdx !== -1) {
    const braceIdx = query.indexOf('{')
    if (braceIdx === -1 || colonIdx < braceIdx) {
      metricAndTags = query.slice(colonIdx + 1)
    }
  }
  // Extract metric name and tags
  const metricMatch = metricAndTags.match(/^([^{]+)(?:\{([^}]*)\})?$/)
  if (!metricMatch) return { metric: null, tags: [] }
  const metric = metricMatch[1].trim()
  const tags = metricMatch[2]
    ? metricMatch[2]
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)
    : []
  return { metric, tags }
}
