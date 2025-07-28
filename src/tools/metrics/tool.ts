import { ExtendedTool, ToolHandlers } from '../../utils/types'
import { v1 } from '@datadog/datadog-api-client'
import { createToolSchema } from '../../utils/tool'
import { QueryMetricsZodSchema, GetMetricsZodSchema } from './schema'
import { log, parseMetricQuery } from '../../utils/helper'
import type { v2 as V2Namespace } from '@datadog/datadog-api-client'

type MetricsToolName = 'query_metrics' | 'search_metrics'
type MetricsTool = ExtendedTool<MetricsToolName>

export const METRICS_TOOLS: MetricsTool[] = [
  createToolSchema(
    QueryMetricsZodSchema,
    'query_metrics',
    'Fetches metrics from Datadog based on a query and time range. Please provide a valid query string, start time (from), and end time (to) in epoch seconds.',
  ),
  createToolSchema(
    GetMetricsZodSchema,
    'search_metrics',
    'Searches a sub-string from all DataDog metrics names. Please provide a query string to filter the metrics.',
  ),
] as const

type MetricsToolHandlers = ToolHandlers<MetricsToolName>

// Modular function to validate tags for a metric
export async function validateMetricTags({
  metric,
  tags,
  v2ApiInstance,
}: {
  metric: string
  tags: string[]
  v2ApiInstance: InstanceType<typeof V2Namespace.MetricsApi>
}): Promise<{
  valid: boolean
  invalidTags: string[]
  allowedTagKeys: string[]
}> {
  log(
    'info',
    `[validateMetricTags] Validating tags for metric:`,
    metric,
    'with tags:',
    JSON.stringify(tags),
  )

  // Filter out wildcard tags from validation - they are always valid
  const tagsToValidate = tags.filter((tag) => {
    const trimmedTag = tag.trim()
    return trimmedTag !== '*' && trimmedTag !== '' && !isWildcardTag(trimmedTag)
  })

  // If no tags need validation, return early
  if (tagsToValidate.length === 0) {
    log(
      'info',
      `[validateMetricTags] No tags to validate (only wildcards or empty tags)`,
    )
    return {
      valid: true,
      invalidTags: [],
      allowedTagKeys: [],
    }
  }

  // Fetch allowed tags for the metric
  const response = await v2ApiInstance.listTagsByMetricName({
    metricName: metric,
  })
  const allowedTags: string[] = response.data?.attributes?.tags || []
  // Allowed tag keys are before the first ':'
  const allowedTagKeys = Array.from(
    new Set(allowedTags.map((t) => t.split(':')[0])),
  )
  log(
    'info',
    `[validateMetricTags] Allowed tag keys for metric`,
    metric,
    ':',
    JSON.stringify(allowedTagKeys),
  )

  // Extract tag keys from the tags to validate
  const queryTagKeys = Array.from(
    new Set(tagsToValidate.map((t) => t.split(':')[0])),
  )

  // Find invalid tag keys (excluding wildcards)
  const invalidTags = queryTagKeys.filter(
    (tagKey) => !allowedTagKeys.includes(tagKey) && !isWildcardTag(tagKey),
  )

  if (invalidTags.length > 0) {
    log(
      'info',
      `[validateMetricTags] Invalid tag keys found:`,
      JSON.stringify(invalidTags),
    )
  }
  return {
    valid: invalidTags.length === 0,
    invalidTags,
    allowedTagKeys,
  }
}

/**
 * Checks if a tag or tag key is a wildcard pattern.
 * Wildcards are always considered valid and should not be validated against allowed tags.
 * Examples: '*', 'host:*', '*:value'
 */
function isWildcardTag(tag: string): boolean {
  const trimmedTag = tag.trim()
  return (
    trimmedTag === '*' ||
    trimmedTag.startsWith('*:') ||
    trimmedTag.endsWith(':*') ||
    trimmedTag.includes('*')
  )
}

// Custom error for invalid arguments
class InvalidArgumentsError extends Error {
  type: string = 'invalid_arguments'
  constructor(message: string) {
    super(message)
    this.name = 'InvalidArgumentsError'
  }
}

export const createMetricsToolHandlers = (
  apiInstance: v1.MetricsApi,
  v2ApiInstance?: InstanceType<typeof V2Namespace.MetricsApi>,
): MetricsToolHandlers => {
  return {
    query_metrics: async (request) => {
      const { from, to, query } = QueryMetricsZodSchema.parse(
        request.params.arguments,
      )
      log('info', `[query_metrics] Received query:`, query)
      const { metric, tags } = parseMetricQuery(query)
      log(
        'info',
        `[query_metrics] Parsed metric:`,
        metric,
        'tags:',
        JSON.stringify(tags),
      )
      if (tags.length > 0 && metric && v2ApiInstance) {
        const { valid, invalidTags, allowedTagKeys } = await validateMetricTags(
          {
            metric,
            tags,
            v2ApiInstance,
          },
        )
        if (!valid) {
          log(
            'info',
            `[query_metrics] Throwing error for invalid tags:`,
            JSON.stringify(invalidTags),
          )
          throw new InvalidArgumentsError(
            `The following tags are invalid for metric '${metric}': ${invalidTags.join(', ')}. This metric must be queried with only the following tag keys: ${allowedTagKeys.join(', ')}`,
          )
        }
      }
      const response = await apiInstance.queryMetrics({
        from,
        to,
        query,
      })
      return {
        content: [
          {
            type: 'text',
            text: `Queried metrics data: ${JSON.stringify({ response })}`,
          },
        ],
      }
    },
    search_metrics: async (request) => {
      const { q } = GetMetricsZodSchema.parse(request.params.arguments)
      const response = await apiInstance.listMetrics({ q: q || '*' })
      return {
        content: [
          {
            type: 'text',
            text: `Fetched metrics: ${JSON.stringify(response)}`,
          },
        ],
      }
    },
  }
}
