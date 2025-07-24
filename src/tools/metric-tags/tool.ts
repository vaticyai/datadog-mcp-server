import { ExtendedTool, ToolHandlers } from '../../utils/types'
import { v2 } from '@datadog/datadog-api-client'
import { createToolSchema } from '../../utils/tool'
import { ListTagsByMetricNameZodSchema } from './schema'

type MetricTagsToolName = 'list_tags_by_metric_name'
type MetricTagsTool = ExtendedTool<MetricTagsToolName>

export const METRIC_TAGS_TOOLS: MetricTagsTool[] = [
  createToolSchema(
    ListTagsByMetricNameZodSchema,
    'list_tags_by_metric_name',
    'List all tags for a given metric name using Datadog API',
  ),
] as const

type MetricTagsToolHandlers = ToolHandlers<MetricTagsToolName>

export const createMetricTagsToolHandlers = (
  apiInstance: v2.MetricsApi,
): MetricTagsToolHandlers => {
  return {
    list_tags_by_metric_name: async (request) => {
      const { metric_name } = ListTagsByMetricNameZodSchema.parse(
        request.params.arguments,
      )
      const response = await apiInstance.listTagsByMetricName({
        metricName: metric_name,
      })
      return {
        content: [
          {
            type: 'text',
            text: `Tags for metric '${metric_name}': ${JSON.stringify(response.data?.attributes?.tags ?? [])}`,
          },
        ],
      }
    },
  }
}
