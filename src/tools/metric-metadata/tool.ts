import { ExtendedTool, ToolHandlers } from '../../utils/types'
import { v1 } from '@datadog/datadog-api-client'
import { createToolSchema } from '../../utils/tool'
import { GetMetricMetadataZodSchema } from './schema'
import { log } from '../../utils/helper'

type MetricMetadataToolName = 'get_metric_metadata'
type MetricMetadataTool = ExtendedTool<MetricMetadataToolName>

export const METRIC_METADATA_TOOLS: MetricMetadataTool[] = [
  createToolSchema(
    GetMetricMetadataZodSchema,
    'get_metric_metadata',
    'Get metadata for a specific metric name from Datadog. Returns information such as description, unit, type, and other metadata associated with the metric.',
  ),
] as const

type MetricMetadataToolHandlers = ToolHandlers<MetricMetadataToolName>

export const createMetricMetadataToolHandlers = (
  apiInstance: v1.MetricsApi,
): MetricMetadataToolHandlers => {
  return {
    get_metric_metadata: async (request) => {
      const { metric_name } = GetMetricMetadataZodSchema.parse(
        request.params.arguments,
      )

      log(
        'info',
        `[get_metric_metadata] Getting metadata for metric:`,
        metric_name,
      )

      try {
        const response = await apiInstance.getMetricMetadata({
          metricName: metric_name,
        })

        const metadata = response
        log(
          'info',
          `[get_metric_metadata] Retrieved metadata:`,
          JSON.stringify(metadata),
        )

        return {
          content: [
            {
              type: 'text',
              text: `Metadata for metric '${metric_name}': ${JSON.stringify(metadata, null, 2)}`,
            },
          ],
        }
      } catch (error) {
        log(
          'error',
          `[get_metric_metadata] Error getting metadata for metric ${metric_name}:`,
          error,
        )
        throw new Error(
          `Failed to get metadata for metric '${metric_name}': ${error instanceof Error ? error.message : String(error)}`,
        )
      }
    },
  }
}
