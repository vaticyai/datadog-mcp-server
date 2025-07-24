import { ExtendedTool, ToolHandlers } from '../../utils/types'
import { v1 } from '@datadog/datadog-api-client'
import { createToolSchema } from '../../utils/tool'
import { QueryMetricsZodSchema, GetMetricsZodSchema } from './schema'

type MetricsToolName = 'query_metrics' | 'search_metrics'
type MetricsTool = ExtendedTool<MetricsToolName>

export const METRICS_TOOLS: MetricsTool[] = [
  createToolSchema(
    QueryMetricsZodSchema,
    'query_metrics',
    'Query timeseries points of metrics from Datadog',
  ),
  createToolSchema(
    GetMetricsZodSchema,
    'search_metrics',
    'Searches a sub-string from all DataDog metrics names. Please provide a query string to filter the metrics.',
  ),
] as const

type MetricsToolHandlers = ToolHandlers<MetricsToolName>

export const createMetricsToolHandlers = (
  apiInstance: v1.MetricsApi,
): MetricsToolHandlers => {
  return {
    query_metrics: async (request) => {
      const { from, to, query } = QueryMetricsZodSchema.parse(
        request.params.arguments,
      )
      const response = await apiInstance.queryMetrics({ from, to, query })
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
