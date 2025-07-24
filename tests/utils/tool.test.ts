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
    expect(result.tags).toEqual([])
  })
  it('returns null metric for invalid query', () => {
    const result = parseMetricQuery('')
    expect(result.metric).toBeNull()
    expect(result.tags).toEqual([])
  })
})
