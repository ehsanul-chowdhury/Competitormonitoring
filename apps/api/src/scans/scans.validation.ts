import { z } from "zod"

export const triggerScanSchema = z.object({
  tracked_page_id: z.uuid(),
})
