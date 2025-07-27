import { z } from 'zod'

export const SearchMetricTagsZodSchema = z.object({
  metric_name: z
    .string()
    .describe('The name of the metric to search tags for.'),
  search_string: z
    .string()
    .describe('The string to search for in the metric tags.'),
  use_regex: z
    .boolean()
    .optional()
    .default(false)
    .describe(
      'Whether to treat the search string as a regex pattern. Defaults to false.',
    ),
})

export type SearchMetricTagsArgs = z.infer<typeof SearchMetricTagsZodSchema>
