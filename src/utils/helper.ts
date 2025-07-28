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
 * Parses a Datadog metric query string into its components.
 * Handles various query patterns including:
 * - Simple metrics: 'system.cpu.user{*}'
 * - Aggregation functions: 'avg:system.cpu.user{*}'
 * - Complex functions: 'sum(last_5m):sum:aws.applicationelb.httpcode_elb_5xx{*}'
 * - Tag filtering: 'metric{tag:value OR tag:value2}'
 * - Arithmetic: 'avg:metric{*} * 100'
 * - Time shifts: 'avg:metric{*}.rollup(sum, 30) / timeshift(avg:metric{*}, -1d)'
 * - Advanced tag filters: 'metric{service:web-*} - metric{service!~web-api}'
 *
 * @param query - The metric query string to parse
 * @returns Object containing the metric name and array of tags
 */
export function parseMetricQuery(query: string): {
  metric: string
  tags: string[]
} {
  if (!query) {
    return { metric: '', tags: [] }
  }

  // Extract the metric name first
  let metric = ''

  // Remove any arithmetic operations and their operands after the first metric
  const arithmeticSplit = query.split(/[\s]*[+\-*/][\s]*/)
  const firstPart = arithmeticSplit[0]

  // Handle time-shift and rollup functions
  const functionPattern =
    /^(?:(?:timeshift|rollup|sum|avg|min|max|count)\([^)]+\):)*([^{]+)/
  const metricMatch = firstPart.match(functionPattern)

  if (metricMatch) {
    // Find the last colon before any tags or operators
    const parts = metricMatch[1].split(':')
    metric = parts[parts.length - 1].trim()
  } else {
    // If no function pattern found, use everything before the first brace or operator
    const simpleSplit = firstPart.split('{')[0]
    metric = simpleSplit.trim()
  }

  // If no braces in query, return empty tags
  if (!query.includes('{')) {
    return { metric, tags: [] }
  }

  // Extract tags from the query
  const tags: string[] = []
  const tagRegex = /{([^}]*)}/g
  const tagMatches = query.match(tagRegex)

  if (!tagMatches) {
    return { metric, tags: [] }
  }

  // Process each tag group (inside braces)
  for (const tagMatch of tagMatches) {
    // Skip 'by' grouping tags
    if (
      query.includes(' by ') &&
      query.indexOf(tagMatch) > query.indexOf(' by ')
    ) {
      continue
    }

    // Remove the braces
    const tagContent = tagMatch.slice(1, -1).trim()

    if (!tagContent || tagContent === '*') {
      if (!tags.includes('*')) {
        tags.push('*')
      }
      continue
    }

    // Handle complex expressions with AND/OR and parentheses
    const normalizedContent = tagContent
      .replace(/\s+AND\s+/gi, ' AND ') // Case-insensitive match for AND
      .replace(/\s+OR\s+/gi, ' OR ') // Case-insensitive match for OR

    // Split by OR first
    const orGroups = normalizedContent.split(/ OR /i)

    orGroups.forEach((group) => {
      // Handle AND groups
      const andGroups = group.split(/ AND /i)

      andGroups.forEach((tag) => {
        // Remove any parentheses
        const cleanTag = tag.replace(/[()]/g, '').trim()

        // Handle comma-separated tags
        const commaTags = cleanTag.split(',')
        commaTags.forEach((commaTag) => {
          const trimmedTag = commaTag.trim()
          if (trimmedTag && trimmedTag !== '*') {
            // Don't add duplicates
            if (!tags.includes(trimmedTag)) {
              tags.push(trimmedTag)
            }
          }
        })
      })
    })
  }

  // If no tags were found but braces were present, use wildcard
  if (tags.length === 0 && query.includes('{')) {
    tags.push('*')
  }

  return { metric, tags }
}

/**
 * Parses tag expressions that may contain OR and AND operators.
 * Extracts individual tag key:value pairs while preserving operator context.
 * Examples:
 * - "env:prod,host:web-01" -> ["env:prod", "host:web-01"]
 * - "name:alb-1 OR name:alb-2 OR name:alb-3" -> ["name:alb-1", "name:alb-2", "name:alb-3"]
 * - "env:prod AND (name:alb-1 OR name:alb-2)" -> ["env:prod", "name:alb-1", "name:alb-2"]
 * - "env:prod and (name:alb-1 or name:alb-2)" -> ["env:prod", "name:alb-1", "name:alb-2"]
 */
function parseTagsWithOperators(tagsString: string): string[] {
  if (!tagsString.trim()) return []

  // If it's just a wildcard, return it
  if (tagsString.trim() === '*') return ['*']

  const tags: string[] = []

  // Split by common operators and delimiters
  // Handle both comma separation and logical operators
  let current = ''
  let inParens = 0

  for (let i = 0; i < tagsString.length; i++) {
    const char = tagsString[i]

    if (char === '(') {
      inParens++
      current += char
    } else if (char === ')') {
      inParens--
      current += char
    } else if (char === ',' && inParens === 0) {
      // Comma separator (traditional)
      if (current.trim()) {
        tags.push(...extractTagsFromExpression(current.trim()))
      }
      current = ''
    } else if (
      inParens === 0 &&
      (tagsString.slice(i, i + 4).toLowerCase() === ' or ' ||
        tagsString.slice(i, i + 5).toLowerCase() === ' and ')
    ) {
      // OR/AND operator (case insensitive)
      if (current.trim()) {
        tags.push(...extractTagsFromExpression(current.trim()))
      }
      // Skip the operator
      i += tagsString.slice(i, i + 4).toLowerCase() === ' or ' ? 3 : 4
      current = ''
    } else {
      current += char
    }
  }

  // Add the last part
  if (current.trim()) {
    tags.push(...extractTagsFromExpression(current.trim()))
  }

  // Remove duplicates and filter out empty strings
  return Array.from(new Set(tags.filter((tag) => tag.trim() !== '')))
}

/**
 * Extracts tag key:value pairs from a single expression.
 * Handles parentheses and nested expressions.
 */
function extractTagsFromExpression(expression: string): string[] {
  // Remove outer parentheses if they wrap the entire expression
  let expr = expression.trim()
  while (expr.startsWith('(') && expr.endsWith(')')) {
    let parenCount = 0
    let isWrapped = true
    for (let i = 0; i < expr.length; i++) {
      if (expr[i] === '(') parenCount++
      if (expr[i] === ')') parenCount--
      if (parenCount === 0 && i < expr.length - 1) {
        isWrapped = false
        break
      }
    }
    if (isWrapped) {
      expr = expr.slice(1, -1).trim()
    } else {
      break
    }
  }

  // If this looks like a single tag (contains :), return it
  if (expr.includes(':') && !expr.includes(' OR ') && !expr.includes(' AND ')) {
    return [expr]
  }

  // If it contains operators, recursively parse
  if (expr.includes(' OR ') || expr.includes(' AND ')) {
    return parseTagsWithOperators(expr)
  }

  // Fallback: split by comma
  return expr
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)
}
