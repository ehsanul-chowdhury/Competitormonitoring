export const SCAN_QUEUE_NAME = "scans"

export type ScanJobData = {
  trackedPageId: string
  scanId?: string
  trigger: "manual" | "cron"
}
