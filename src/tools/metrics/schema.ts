import { z } from 'zod'

export const QueryMetricsZodSchema = z.object({
  from: z
    .number()
    .describe(
      'Start of the queried time period, seconds since the Unix epoch.',
    ),
  to: z
    .number()
    .describe('End of the queried time period, seconds since the Unix epoch.'),
  query: z
    .string()
    .describe('Datadog metrics query string. e.g. "avg:system.cpu.user{*}"'),
})

export type QueryMetricsArgs = z.infer<typeof QueryMetricsZodSchema>

export const GetMetricsZodSchema = z.object({
  q: z
    .string()
    .optional()
    .describe('Query string for filtering metrics. Defaults to "*".'),
})

export type GetMetricsArgs = z.infer<typeof GetMetricsZodSchema>

export const FilterMetricsByTagsZodSchema = z.object({
  tags: z
    .array(z.string())
    .describe(
      'Array of tags to filter metrics by. e.g. ["kube_deployment:api-gateway", "env:prod"]',
    ),
  windowSeconds: z
    .number()
    .optional()
    .describe(
      'The number of seconds of look back (from now) to apply to the filter. Default value is 3600 (1 hour), maximum value is 2,592,000 (30 days).',
    ),
})

export type FilterMetricsByTagsArgs = z.infer<
  typeof FilterMetricsByTagsZodSchema
>
