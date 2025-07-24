import { v2 } from '@datadog/datadog-api-client'
import { describe, it, expect } from 'vitest'
import { createDatadogConfig } from '../../src/utils/datadog'
import { createMetricTagsToolHandlers } from '../../src/tools/metric-tags/tool'
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
          tags: ['env:prod', 'region:us-east-1', 'service:web'],
        },
      },
    })
  },
)

describe('Metric Tags Tool', () => {
  if (!process.env.DATADOG_API_KEY || !process.env.DATADOG_APP_KEY) {
    throw new Error('DATADOG_API_KEY and DATADOG_APP_KEY must be set')
  }

  const datadogConfig = createDatadogConfig({
    apiKeyAuth: process.env.DATADOG_API_KEY,
    appKeyAuth: process.env.DATADOG_APP_KEY,
    site: process.env.DATADOG_SITE,
  })

  const apiInstance = new v2.MetricsApi(datadogConfig)
  const toolHandlers = createMetricTagsToolHandlers(apiInstance)

  describe.concurrent('list_tags_by_metric_name', async () => {
    it('should list tags for a given metric name', async () => {
      const server = setupServer(tagsHandler)

      await server.boundary(async () => {
        const request = createMockToolRequest('list_tags_by_metric_name', {
          metric_name: 'test.metric',
        })
        const response = (await toolHandlers.list_tags_by_metric_name(
          request,
        )) as unknown as DatadogToolResponse

        expect(response.content[0].text).toContain('Tags for metric')
        expect(response.content[0].text).toContain('env:prod')
        expect(response.content[0].text).toContain('region:us-east-1')
        expect(response.content[0].text).toContain('service:web')
      })()

      server.close()
    })
  })
})
