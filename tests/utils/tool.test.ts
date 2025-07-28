import { describe, it, expect } from 'vitest'
import { Tool } from '@modelcontextprotocol/sdk/types.js'
import { createToolSchema } from '../../src/utils/tool'
import { z } from 'zod'
import { parseMetricQuery } from '../../src/utils/helper'

describe('createToolSchema', () => {
  it('should generate tool schema with correct inputSchema when definitions exist', () => {
    // Create a dummy schema with a matching definition for the tool name
    const dummySchema = z.object({
      foo: z.string().describe('foo description'),
      bar: z.number().describe('bar description').optional(),
      baz: z.boolean().describe('baz description').default(false),
      qux: z.number().describe('qux description').min(10).max(20).default(15),
    })

    // Call createToolSchema with the dummy schema, tool name, and description
    const gotTool = createToolSchema(
      dummySchema,
      'test',
      'dummy test description',
    )

    // Expected inputSchema based on the dummy schema
    const expectedInputSchema: Tool = {
      name: 'test',
      description: 'dummy test description',
      inputSchema: {
        type: 'object',
        properties: {
          foo: {
            type: 'string',
            description: 'foo description',
          },
          bar: {
            type: 'number',
            description: 'bar description',
          },
          baz: {
            type: 'boolean',
            description: 'baz description',
            default: false,
          },
          qux: {
            type: 'number',
            description: 'qux description',
            default: 15,
            minimum: 10,
            maximum: 20,
          },
        },
        required: ['foo'],
      },
    }

    // Verify the returned tool object matches expected structure
    expect(gotTool).toEqual(expectedInputSchema)
  })
})

describe('parseMetricQuery', () => {
  it('parses metric and tags with function prefix', () => {
    const result = parseMetricQuery('avg:system.cpu.user{env:prod,host:web-01}')
    expect(result.metric).toBe('system.cpu.user')
    expect(result.tags).toEqual(['env:prod', 'host:web-01'])
  })
  it('parses metric and tags without function prefix', () => {
    const result = parseMetricQuery(
      'api_gateway_total_requests.count{test:test}',
    )
    expect(result.metric).toBe('api_gateway_total_requests.count')
    expect(result.tags).toEqual(['test:test'])
  })
  it('parses metric with no tags and function prefix', () => {
    const result = parseMetricQuery('sum:my.metric')
    expect(result.metric).toBe('my.metric')
    expect(result.tags).toEqual([])
  })
  it('parses metric with no tags and no function prefix', () => {
    const result = parseMetricQuery('my.metric')
    expect(result.metric).toBe('my.metric')
    expect(result.tags).toEqual([])
  })
  it('parses metric with empty tag braces', () => {
    const result = parseMetricQuery('my.metric{}')
    expect(result.metric).toBe('my.metric')
    expect(result.tags).toEqual(['*']) // Empty braces now correctly returns wildcard
  })
  it('returns empty metric for invalid query', () => {
    const result = parseMetricQuery('')
    expect(result.metric).toBe('') // Empty string now returns empty string instead of null
    expect(result.tags).toEqual([])
  })

  it('parses metric with OR operators in tags', () => {
    const result = parseMetricQuery(
      'sum:aws.applicationelb.httpcode_elb_5xx{name:alb-1 OR name:alb-2 OR name:alb-3}',
    )
    expect(result.metric).toBe('aws.applicationelb.httpcode_elb_5xx')
    expect(result.tags).toEqual(['name:alb-1', 'name:alb-2', 'name:alb-3'])
  })

  it('parses complex query with function prefix and OR operators', () => {
    const result = parseMetricQuery(
      'sum(last_5m):sum:aws.applicationelb.httpcode_elb_5xx{name:alb-1 OR name:alb-2 OR name:alb-3} by {name}.as_count() > 500',
    )
    expect(result.metric).toBe('aws.applicationelb.httpcode_elb_5xx')
    expect(result.tags).toEqual(['name:alb-1', 'name:alb-2', 'name:alb-3'])
  })

  it('parses metric with AND and OR operators', () => {
    const result = parseMetricQuery(
      'avg:system.cpu.user{env:prod AND (name:alb-1 OR name:alb-2)}',
    )
    expect(result.metric).toBe('system.cpu.user')
    expect(result.tags).toEqual(['env:prod', 'name:alb-1', 'name:alb-2'])
  })

  it('parses metric with wildcard tags mixed with specific tags', () => {
    const result = parseMetricQuery('avg:system.cpu.user{host:*,env:prod}')
    expect(result.metric).toBe('system.cpu.user')
    expect(result.tags).toEqual(['host:*', 'env:prod'])
  })

  it('parses metric with complex nested expressions', () => {
    const result = parseMetricQuery(
      'avg:system.cpu.user{(env:prod OR env:staging) AND host:web-*}',
    )
    expect(result.metric).toBe('system.cpu.user')
    expect(result.tags).toEqual(['env:prod', 'env:staging', 'host:web-*'])
  })

  it('parses arithmetic operations between metrics', () => {
    const result = parseMetricQuery('avg:system.cpu.user{*} * 100')
    expect(result.metric).toBe('system.cpu.user')
    expect(result.tags).toEqual(['*'])
  })

  it('parses time-shift operations', () => {
    const result = parseMetricQuery(
      'timeshift(avg:system.cpu.user{env:prod}, -1d)',
    )
    expect(result.metric).toBe('system.cpu.user')
    expect(result.tags).toEqual(['env:prod'])
  })

  it('parses rollup functions', () => {
    const result = parseMetricQuery('avg:system.cpu.user{*}.rollup(sum, 30)')
    expect(result.metric).toBe('system.cpu.user')
    expect(result.tags).toEqual(['*'])
  })

  it('parses regex tag filters', () => {
    const result = parseMetricQuery(
      'system.cpu.user{service!~web-api,env:prod}',
    )
    expect(result.metric).toBe('system.cpu.user')
    expect(result.tags).toEqual(['service!~web-api', 'env:prod'])
  })

  it('parses wildcard tag filters', () => {
    const result = parseMetricQuery('system.cpu.user{service:web-*}')
    expect(result.metric).toBe('system.cpu.user')
    expect(result.tags).toEqual(['service:web-*'])
  })

  it('parses complex arithmetic and functions', () => {
    const result = parseMetricQuery(
      'sum:system.cpu.user{*}.rollup(avg, 60) / timeshift(sum:system.cpu.user{*}, -1d)',
    )
    expect(result.metric).toBe('system.cpu.user')
    expect(result.tags).toEqual(['*'])
  })

  it('parses multiple aggregation functions', () => {
    const result = parseMetricQuery('avg:sum:system.cpu.user{*} by {host}')
    expect(result.metric).toBe('system.cpu.user')
    expect(result.tags).toEqual(['*'])
  })

  it('parses complex tag combinations with wildcards', () => {
    const result = parseMetricQuery(
      'system.cpu.user{service:web-* OR service!~api-*, env:prod}',
    )
    expect(result.metric).toBe('system.cpu.user')
    expect(result.tags).toEqual(['service:web-*', 'service!~api-*', 'env:prod'])
  })
})
