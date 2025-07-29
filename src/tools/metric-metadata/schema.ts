import { z } from 'zod'

export const GetMetricMetadataZodSchema = z.object({
  metric_name: z
    .string()
    .describe('The name of the metric to get metadata for'),
})

export type GetMetricMetadataArgs = z.infer<typeof GetMetricMetadataZodSchema>
