import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createMetricMetadataToolHandlers } from '../../src/tools/metric-metadata'

// Mock the Datadog API client
vi.mock('@datadog/datadog-api-client', () => ({
  v1: {
    MetricsApi: vi.fn(),
  },
}))

describe('Metric Metadata Tool', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockApiInstance: any

  beforeEach(() => {
    mockApiInstance = {
      getMetricMetadata: vi.fn(),
    }
    vi.clearAllMocks()
  })

  describe('get_metric_metadata', () => {
    it('should return metric metadata successfully', async () => {
      const mockMetadata = {
        description: 'CPU usage percentage',
        unit: 'percent',
        type: 'gauge',
        tags: ['host', 'env'],
      }

      mockApiInstance.getMetricMetadata.mockResolvedValue(mockMetadata)

      const handlers = createMetricMetadataToolHandlers(mockApiInstance)

      const result = await handlers.get_metric_metadata({
        method: 'tools/call',
        params: {
          name: 'get_metric_metadata',
          arguments: {
            metric_name: 'system.cpu.user',
          },
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any)

      expect(mockApiInstance.getMetricMetadata).toHaveBeenCalledWith({
        metricName: 'system.cpu.user',
      })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((result as any).content[0].text).toContain(
        "Metadata for metric 'system.cpu.user'",
      )
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((result as any).content[0].text).toContain(
        JSON.stringify(mockMetadata, null, 2),
      )
    })

    it('should handle API errors gracefully', async () => {
      const errorMessage = 'Metric not found'
      mockApiInstance.getMetricMetadata.mockRejectedValue(
        new Error(errorMessage),
      )

      const handlers = createMetricMetadataToolHandlers(mockApiInstance)

      await expect(
        handlers.get_metric_metadata({
          method: 'tools/call',
          params: {
            name: 'get_metric_metadata',
            arguments: {
              metric_name: 'nonexistent.metric',
            },
          },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any),
      ).rejects.toThrow(
        "Failed to get metadata for metric 'nonexistent.metric': Metric not found",
      )

      expect(mockApiInstance.getMetricMetadata).toHaveBeenCalledWith({
        metricName: 'nonexistent.metric',
      })
    })

    it('should validate required parameters', async () => {
      const handlers = createMetricMetadataToolHandlers(mockApiInstance)

      await expect(
        handlers.get_metric_metadata({
          method: 'tools/call',
          params: {
            name: 'get_metric_metadata',
            arguments: {},
          },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any),
      ).rejects.toThrow()
    })
  })
})
