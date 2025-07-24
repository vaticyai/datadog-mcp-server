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
