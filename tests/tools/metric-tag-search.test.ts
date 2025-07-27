import { v2 } from '@datadog/datadog-api-client'
import { describe, it, expect } from 'vitest'
import { createDatadogConfig } from '../../src/utils/datadog'
import { createMetricTagSearchToolHandlers } from '../../src/tools/metric-tag-search/tool'
import { createMockToolRequest } from '../helpers/mock'
import { http, HttpResponse } from 'msw'
import { setupServer } from '../helpers/msw'
import { DatadogToolResponse } from '../helpers/datadog'

// Use a RegExp matcher for the full URL to match any metric name in the endpoint
const tagsHandler = http.get(
  /\/api\/v2\/metrics\/[^/]+\/all-tags$/,
  async () => {
    return HttpResponse.json({
      data: {
        id: 'test.metric',
        type: 'metric_tags',
        attributes: {
          tags: [
            'env:prod',
            'region:us-east-1',
            'service:web',
            'presidio-analyzer:container-1',
            'presidio-analyzer:container-2',
            'presidio:service-1',
            'analyzer:component-1',
            'kubernetes:pod-1',
            'docker:container-3',
          ],
        },
      },
    })
  },
)

describe('Metric Tag Search Tool', () => {
  if (!process.env.DATADOG_API_KEY || !process.env.DATADOG_APP_KEY) {
    throw new Error('DATADOG_API_KEY and DATADOG_APP_KEY must be set')
  }

  const datadogConfig = createDatadogConfig({
    apiKeyAuth: process.env.DATADOG_API_KEY,
    appKeyAuth: process.env.DATADOG_APP_KEY,
    site: process.env.DATADOG_SITE,
  })

  const apiInstance = new v2.MetricsApi(datadogConfig)
  const toolHandlers = createMetricTagSearchToolHandlers(apiInstance)

  describe.concurrent('search_metric_tags', async () => {
    it('should search for tags using exact string matching', async () => {
      const server = setupServer(tagsHandler)

      await server.boundary(async () => {
        const request = createMockToolRequest('search_metric_tags', {
          metric_name: 'test.metric',
          search_string: 'presidio-analyzer',
          use_regex: false,
        })
        const response = (await toolHandlers.search_metric_tags(
          request,
        )) as unknown as DatadogToolResponse

        expect(response.content[0].text).toContain('Found 2 matching tags')
        expect(response.content[0].text).toContain(
          'presidio-analyzer:container-1',
        )
        expect(response.content[0].text).toContain(
          'presidio-analyzer:container-2',
        )
        expect(response.content[0].text).toContain('exact matching')
      })()

      server.close()
    })

    it('should search for tags using regex pattern', async () => {
      const server = setupServer(tagsHandler)

      await server.boundary(async () => {
        const request = createMockToolRequest('search_metric_tags', {
          metric_name: 'test.metric',
          search_string: 'presidio|analyzer',
          use_regex: true,
        })
        const response = (await toolHandlers.search_metric_tags(
          request,
        )) as unknown as DatadogToolResponse

        expect(response.content[0].text).toContain('Found 4 matching tags')
        expect(response.content[0].text).toContain(
          'presidio-analyzer:container-1',
        )
        expect(response.content[0].text).toContain(
          'presidio-analyzer:container-2',
        )
        expect(response.content[0].text).toContain('presidio:service-1')
        expect(response.content[0].text).toContain('analyzer:component-1')
        expect(response.content[0].text).toContain('regex')
      })()

      server.close()
    })

    it('should handle invalid regex pattern', async () => {
      const server = setupServer(tagsHandler)

      await server.boundary(async () => {
        const request = createMockToolRequest('search_metric_tags', {
          metric_name: 'test.metric',
          search_string: '[invalid',
          use_regex: true,
        })

        await expect(toolHandlers.search_metric_tags(request)).rejects.toThrow(
          'Invalid regex pattern',
        )
      })()

      server.close()
    })

    it('should use default use_regex value (false)', async () => {
      const server = setupServer(tagsHandler)

      await server.boundary(async () => {
        const request = createMockToolRequest('search_metric_tags', {
          metric_name: 'test.metric',
          search_string: 'presidio-analyzer',
          // use_regex not provided, should default to false
        })
        const response = (await toolHandlers.search_metric_tags(
          request,
        )) as unknown as DatadogToolResponse

        expect(response.content[0].text).toContain('Found 2 matching tags')
        expect(response.content[0].text).toContain('exact matching')
      })()

      server.close()
    })

    it('should return empty array when no matches found', async () => {
      const server = setupServer(tagsHandler)

      await server.boundary(async () => {
        const request = createMockToolRequest('search_metric_tags', {
          metric_name: 'test.metric',
          search_string: 'nonexistent',
          use_regex: false,
        })
        const response = (await toolHandlers.search_metric_tags(
          request,
        )) as unknown as DatadogToolResponse

        expect(response.content[0].text).toContain('Found 0 matching tags')
      })()

      server.close()
    })

    it('should handle case sensitivity in exact matching', async () => {
      const server = setupServer(tagsHandler)

      await server.boundary(async () => {
        const request = createMockToolRequest('search_metric_tags', {
          metric_name: 'test.metric',
          search_string: 'PRESIDIO',
          use_regex: false,
        })
        const response = (await toolHandlers.search_metric_tags(
          request,
        )) as unknown as DatadogToolResponse

        expect(response.content[0].text).toContain('Found 0 matching tags')
      })()

      server.close()
    })

    it('should handle case insensitive regex matching', async () => {
      const server = setupServer(tagsHandler)

      await server.boundary(async () => {
        const request = createMockToolRequest('search_metric_tags', {
          metric_name: 'test.metric',
          search_string: 'presidio',
          use_regex: true,
        })
        const response = (await toolHandlers.search_metric_tags(
          request,
        )) as unknown as DatadogToolResponse

        expect(response.content[0].text).toContain('Found 3 matching tags')
        expect(response.content[0].text).toContain(
          'presidio-analyzer:container-1',
        )
        expect(response.content[0].text).toContain(
          'presidio-analyzer:container-2',
        )
        expect(response.content[0].text).toContain('presidio:service-1')
      })()

      server.close()
    })
  })
})
