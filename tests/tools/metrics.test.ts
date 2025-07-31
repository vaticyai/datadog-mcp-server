import { v1 } from '@datadog/datadog-api-client'
import { describe, it, expect } from 'vitest'
import { createDatadogConfig } from '../../src/utils/datadog'
import { createMetricsToolHandlers } from '../../src/tools/metrics/tool'
import { createMockToolRequest } from '../helpers/mock'
import { http, HttpResponse } from 'msw'
import { setupServer } from '../helpers/msw'
import { baseUrl, DatadogToolResponse } from '../helpers/datadog'
import { CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js'
import { z } from 'zod'

const metricsEndpoint = `${baseUrl}/v1/query`

describe('Metrics Tool', () => {
  if (!process.env.DATADOG_API_KEY || !process.env.DATADOG_APP_KEY) {
    throw new Error('DATADOG_API_KEY and DATADOG_APP_KEY must be set')
  }

  const datadogConfig = createDatadogConfig({
    apiKeyAuth: process.env.DATADOG_API_KEY,
    appKeyAuth: process.env.DATADOG_APP_KEY,
    site: process.env.DATADOG_SITE,
  })

  const apiInstance = new v1.MetricsApi(datadogConfig)
  const toolHandlers = createMetricsToolHandlers(apiInstance)

  // https://docs.datadoghq.com/api/latest/metrics/#query-timeseries-data-across-multiple-products
  describe.concurrent('query_metrics', async () => {
    it('should query metrics data', async () => {
      const mockHandler = http.get(metricsEndpoint, async () => {
        return HttpResponse.json({
          status: 'ok',
          query: 'avg:system.cpu.user{*}',
          series: [
            {
              metric: 'system.cpu.user',
              display_name: 'system.cpu.user',
              pointlist: [
                [1640995000000, 23.45],
                [1640995060000, 24.12],
                [1640995120000, 22.89],
                [1640995180000, 25.67],
              ],
              scope: 'host:web-01',
              expression: 'avg:system.cpu.user{*}',
              unit: [
                {
                  family: 'percentage',
                  scale_factor: 1,
                  name: 'percent',
                  short_name: '%',
                },
              ],
            },
            {
              metric: 'system.cpu.user',
              display_name: 'system.cpu.user',
              pointlist: [
                [1640995000000, 18.32],
                [1640995060000, 19.01],
                [1640995120000, 17.76],
                [1640995180000, 20.45],
              ],
              scope: 'host:web-02',
              expression: 'avg:system.cpu.user{*}',
              unit: [
                {
                  family: 'percentage',
                  scale_factor: 1,
                  name: 'percent',
                  short_name: '%',
                },
              ],
            },
          ],
          from_date: 1640995000000,
          to_date: 1641095000000,
          group_by: ['host'],
        })
      })

      const server = setupServer(mockHandler)

      await server.boundary(async () => {
        const request = createMockToolRequest('query_metrics', {
          from: 1640995000,
          to: 1641095000,
          query: 'avg:system.cpu.user{*}',
        })
        const response = (await toolHandlers.query_metrics(
          request,
        )) as unknown as DatadogToolResponse

        expect(response.content[0].text).toContain('Queried metrics data:')
        expect(response.content[0].text).toContain('system.cpu.user')
        expect(response.content[0].text).toContain('host:web-01')
        expect(response.content[0].text).toContain('host:web-02')
        expect(response.content[0].text).toContain('23.45')
      })()

      server.close()
    })

    it('should handle empty response', async () => {
      const mockHandler = http.get(metricsEndpoint, async () => {
        return HttpResponse.json({
          status: 'ok',
          query: 'avg:non.existent.metric{*}',
          series: [],
          from_date: 1640995000000,
          to_date: 1641095000000,
        })
      })

      const server = setupServer(mockHandler)

      await server.boundary(async () => {
        const request = createMockToolRequest('query_metrics', {
          from: 1640995000,
          to: 1641095000,
          query: 'avg:non.existent.metric{*}',
        })
        const response = (await toolHandlers.query_metrics(
          request,
        )) as unknown as DatadogToolResponse

        expect(response.content[0].text).toContain('Queried metrics data:')
        expect(response.content[0].text).toContain('series":[]')
      })()

      server.close()
    })

    it('should handle failed query status', async () => {
      const mockHandler = http.get(metricsEndpoint, async () => {
        return HttpResponse.json({
          status: 'error',
          message: 'Invalid query format',
          query: 'invalid:query:format',
        })
      })

      const server = setupServer(mockHandler)

      await server.boundary(async () => {
        const request = createMockToolRequest('query_metrics', {
          from: 1640995000,
          to: 1641095000,
          query: 'invalid:query:format',
        })
        const response = (await toolHandlers.query_metrics(
          request,
        )) as unknown as DatadogToolResponse

        expect(response.content[0].text).toContain('status":"error"')
        expect(response.content[0].text).toContain('Invalid query format')
      })()

      server.close()
    })

    it('should handle authentication errors', async () => {
      const mockHandler = http.get(metricsEndpoint, async () => {
        return HttpResponse.json(
          { errors: ['Authentication failed'] },
          { status: 403 },
        )
      })

      const server = setupServer(mockHandler)

      await server.boundary(async () => {
        const request = createMockToolRequest('query_metrics', {
          from: 1640995000,
          to: 1641095000,
          query: 'avg:system.cpu.user{*}',
        })
        await expect(toolHandlers.query_metrics(request)).rejects.toThrow()
      })()

      server.close()
    })

    it('should handle rate limit errors', async () => {
      const mockHandler = http.get(metricsEndpoint, async () => {
        return HttpResponse.json(
          { errors: ['Rate limit exceeded'] },
          { status: 429 },
        )
      })

      const server = setupServer(mockHandler)

      await server.boundary(async () => {
        const request = createMockToolRequest('query_metrics', {
          from: 1640995000,
          to: 1641095000,
          query: 'avg:system.cpu.user{*}',
        })
        await expect(toolHandlers.query_metrics(request)).rejects.toThrow(
          'Rate limit exceeded',
        )
      })()

      server.close()
    })

    it('should handle invalid time range errors', async () => {
      const mockHandler = http.get(metricsEndpoint, async () => {
        return HttpResponse.json(
          { errors: ['Time range exceeds allowed limit'] },
          { status: 400 },
        )
      })

      const server = setupServer(mockHandler)

      await server.boundary(async () => {
        // Using a very large time range that might exceed limits
        const request = createMockToolRequest('query_metrics', {
          from: 1600000000, // Very old date
          to: 1700000000, // Very recent date
          query: 'avg:system.cpu.user{*}',
        })
        await expect(toolHandlers.query_metrics(request)).rejects.toThrow(
          'Time range exceeds allowed limit',
        )
      })()

      server.close()
    })
  })
})

describe('Tag validation for metrics', () => {
  it('should return an error if query contains invalid tags', async () => {
    // Mock v2 API for allowed tags
    const allowedTags = ['env', 'host', 'region']
    const v2ApiInstance: InstanceType<
      typeof import('@datadog/datadog-api-client').v2.MetricsApi
    > = {
      listTagsByMetricName: async () => ({
        data: { attributes: { tags: allowedTags.map((t) => `${t}:value`) } },
      }),
    } as unknown as InstanceType<
      typeof import('@datadog/datadog-api-client').v2.MetricsApi
    >
    const v1ApiInstance: import('@datadog/datadog-api-client').v1.MetricsApi = {
      queryMetrics: async () => ({}),
    } as unknown as import('@datadog/datadog-api-client').v1.MetricsApi
    const toolHandlers = createMetricsToolHandlers(v1ApiInstance, v2ApiInstance)
    const request = createMockToolRequest('query_metrics', {
      from: 1640995000,
      to: 1641095000,
      query: 'avg:system.cpu.user{env:prod,foo:bar,host:web-01}',
    })
    await expect(toolHandlers.query_metrics(request)).rejects.toThrow(
      'invalid for metric',
    )
  })

  it('should allow query if all tags are valid', async () => {
    const allowedTags = ['env', 'host', 'region']
    const v2ApiInstance: InstanceType<
      typeof import('@datadog/datadog-api-client').v2.MetricsApi
    > = {
      listTagsByMetricName: async () => ({
        data: { attributes: { tags: allowedTags.map((t) => `${t}:value`) } },
      }),
    } as unknown as InstanceType<
      typeof import('@datadog/datadog-api-client').v2.MetricsApi
    >
    let called = false
    const v1ApiInstance: import('@datadog/datadog-api-client').v1.MetricsApi = {
      queryMetrics: async () => {
        called = true
        return { result: 'ok' }
      },
    } as unknown as import('@datadog/datadog-api-client').v1.MetricsApi
    const toolHandlers = createMetricsToolHandlers(v1ApiInstance, v2ApiInstance)
    const request = createMockToolRequest('query_metrics', {
      from: 1640995000,
      to: 1641095000,
      query: 'avg:system.cpu.user{env:prod,host:web-01}',
    })
    const response = (await toolHandlers.query_metrics(
      request,
    )) as unknown as DatadogToolResponse
    expect(called).toBe(true)
    expect(response.content[0].text).toContain('Queried metrics data:')
  })
})

describe('filter_metrics_by_tags', () => {
  it('should filter metrics by tags using v2 API', async () => {
    const mockV2Api: InstanceType<
      typeof import('@datadog/datadog-api-client').v2.MetricsApi
    > = {
      listTagConfigurations: async () => ({
        data: [
          { id: 'metric1', type: 'metrics' },
          { id: 'metric2', type: 'metrics' },
        ],
        meta: { page: { totalCount: 2 } },
      }),
    } as unknown as InstanceType<
      typeof import('@datadog/datadog-api-client').v2.MetricsApi
    >

    const mockV1Api: import('@datadog/datadog-api-client').v1.MetricsApi = {
      queryMetrics: async () => ({}),
    } as unknown as import('@datadog/datadog-api-client').v1.MetricsApi

    const handlers = createMetricsToolHandlers(mockV1Api, mockV2Api)

    const result = (await handlers.filter_metrics_by_tags({
      method: 'tools/call',
      params: {
        name: 'filter_metrics_by_tags',
        arguments: {
          tags: ['kube_deployment:api-gateway', 'env:prod'],
        },
      },
    } as z.infer<
      typeof CallToolRequestSchema
    >)) as unknown as DatadogToolResponse

    expect(result.content[0].text).toContain('Found 2 metrics with tags')
    expect(result.content[0].text).toContain('metric1')
    expect(result.content[0].text).toContain('metric2')
  })

  it('should filter metrics by tags with custom time window', async () => {
    const mockV2Api: InstanceType<
      typeof import('@datadog/datadog-api-client').v2.MetricsApi
    > = {
      listTagConfigurations: async () => ({
        data: [{ id: 'metric1', type: 'metrics' }],
        meta: { page: { totalCount: 1 } },
      }),
    } as unknown as InstanceType<
      typeof import('@datadog/datadog-api-client').v2.MetricsApi
    >

    const mockV1Api: import('@datadog/datadog-api-client').v1.MetricsApi = {
      queryMetrics: async () => ({}),
    } as unknown as import('@datadog/datadog-api-client').v1.MetricsApi

    const handlers = createMetricsToolHandlers(mockV1Api, mockV2Api)

    const result = (await handlers.filter_metrics_by_tags({
      method: 'tools/call',
      params: {
        name: 'filter_metrics_by_tags',
        arguments: {
          tags: ['kube_deployment:api-gateway'],
          windowSeconds: 7200, // 2 hours
        },
      },
    } as z.infer<
      typeof CallToolRequestSchema
    >)) as unknown as DatadogToolResponse

    expect(result.content[0].text).toContain('Found 1 metrics with tags')
    expect(result.content[0].text).toContain('in the last 7200 seconds')
  })

  it('should handle missing v2 API instance', async () => {
    const mockV1Api: import('@datadog/datadog-api-client').v1.MetricsApi = {
      queryMetrics: async () => ({}),
    } as unknown as import('@datadog/datadog-api-client').v1.MetricsApi

    const handlers = createMetricsToolHandlers(mockV1Api)

    await expect(
      handlers.filter_metrics_by_tags({
        method: 'tools/call',
        params: {
          name: 'filter_metrics_by_tags',
          arguments: {
            tags: ['kube_deployment:api-gateway'],
          },
        },
      } as z.infer<typeof CallToolRequestSchema>),
    ).rejects.toThrow(
      'v2 API instance is required for filtering metrics by tags',
    )
  })

  it('should handle API errors gracefully', async () => {
    const mockV2Api: InstanceType<
      typeof import('@datadog/datadog-api-client').v2.MetricsApi
    > = {
      listTagConfigurations: async () => {
        throw new Error('API Error')
      },
    } as unknown as InstanceType<
      typeof import('@datadog/datadog-api-client').v2.MetricsApi
    >

    const mockV1Api: import('@datadog/datadog-api-client').v1.MetricsApi = {
      queryMetrics: async () => ({}),
    } as unknown as import('@datadog/datadog-api-client').v1.MetricsApi

    const handlers = createMetricsToolHandlers(mockV1Api, mockV2Api)

    await expect(
      handlers.filter_metrics_by_tags({
        method: 'tools/call',
        params: {
          name: 'filter_metrics_by_tags',
          arguments: {
            tags: ['kube_deployment:api-gateway'],
          },
        },
      } as z.infer<typeof CallToolRequestSchema>),
    ).rejects.toThrow('Failed to filter metrics by tags: Error: API Error')
  })
})
