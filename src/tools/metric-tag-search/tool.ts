import { ExtendedTool, ToolHandlers } from '../../utils/types'
import { v2 } from '@datadog/datadog-api-client'
import { createToolSchema } from '../../utils/tool'
import { SearchMetricTagsZodSchema } from './schema'
import { log } from '../../utils/helper'

type MetricTagSearchToolName = 'search_metric_tags'
type MetricTagSearchTool = ExtendedTool<MetricTagSearchToolName>

export const METRIC_TAG_SEARCH_TOOLS: MetricTagSearchTool[] = [
  createToolSchema(
    SearchMetricTagsZodSchema,
    'search_metric_tags',
    'Search for tags of a specific metric name that match a given string. Supports both exact string matching and regex patterns.',
  ),
] as const

type MetricTagSearchToolHandlers = ToolHandlers<MetricTagSearchToolName>

export const createMetricTagSearchToolHandlers = (
  apiInstance: v2.MetricsApi,
): MetricTagSearchToolHandlers => {
  return {
    search_metric_tags: async (request) => {
      const { metric_name, search_string, use_regex } =
        SearchMetricTagsZodSchema.parse(request.params.arguments)

      log(
        'info',
        `[search_metric_tags] Searching for tags in metric '${metric_name}' with search string '${search_string}', use_regex: ${use_regex}`,
      )

      const response = await apiInstance.listTagsByMetricName({
        metricName: metric_name,
      })

      const allTags: string[] = response.data?.attributes?.tags ?? []
      log(
        'info',
        `[search_metric_tags] Found ${allTags.length} total tags for metric '${metric_name}'`,
      )

      // Log first few tags for debugging
      if (allTags.length > 0) {
        log(
          'info',
          `[search_metric_tags] Sample tags: ${allTags.slice(0, 5).join(', ')}`,
        )
      }

      let matchingTags: string[] = []

      if (use_regex) {
        try {
          const regex = new RegExp(search_string)
          matchingTags = allTags.filter((tag) => regex.test(tag))
          log(
            'info',
            `[search_metric_tags] Using regex pattern '${search_string}', found ${matchingTags.length} matching tags`,
          )
        } catch (error) {
          log(
            'error',
            `[search_metric_tags] Invalid regex pattern '${search_string}':`,
            error,
          )
          throw new Error(
            `Invalid regex pattern '${search_string}': ${error instanceof Error ? error.message : String(error)}`,
          )
        }
      } else {
        matchingTags = allTags.filter((tag) => tag.includes(search_string))
        log(
          'info',
          `[search_metric_tags] Using exact string matching for '${search_string}', found ${matchingTags.length} matching tags`,
        )

        // Debug: show which tags matched and which didn't
        if (matchingTags.length === 0 && allTags.length > 0) {
          log(
            'info',
            `[search_metric_tags] No matches found. Checking if search string exists in any tag...`,
          )
          const hasPartialMatch = allTags.some((tag) =>
            tag.toLowerCase().includes(search_string.toLowerCase()),
          )
          log(
            'info',
            `[search_metric_tags] Case-insensitive partial match exists: ${hasPartialMatch}`,
          )

          // Show a few examples of what we're searching in
          log('info', `[search_metric_tags] Search string: '${search_string}'`)
          log(
            'info',
            `[search_metric_tags] First few tags to search in: ${allTags
              .slice(0, 3)
              .map((tag) => `'${tag}'`)
              .join(', ')}`,
          )
        }
      }

      return {
        content: [
          {
            type: 'text',
            text: `Found ${matchingTags.length} matching tags for metric '${metric_name}' with search string '${search_string}' (${use_regex ? 'regex' : 'exact'} matching): ${JSON.stringify(matchingTags)}`,
          },
        ],
      }
    },
  }
}
