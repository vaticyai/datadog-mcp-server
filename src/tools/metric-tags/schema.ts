import { z } from 'zod'

export const ListTagsByMetricNameZodSchema = z.object({
  metric_name: z
    .string()
    .describe('The name of the metric to retrieve tags for.'),
})

export type ListTagsByMetricNameArgs = z.infer<
  typeof ListTagsByMetricNameZodSchema
>
