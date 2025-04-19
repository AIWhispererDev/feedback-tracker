export type DuplicateCheckLog = {
  id: string
  timestamp: number
  newFeedback: {
    title: string
    description: string
    submitterInfo?: {
      ip?: string
    }
  }
  comparedWith: {
    id: number
    title: string
    description: string
    submitterInfo?: {
      ip?: string
    }
  }
  similarityResults: {
    algorithm: string
    titleSimilarity: number
    descriptionSimilarity: number
    overallSimilarity: number
    threshold: number
    isSimilar: boolean
  }
  timeProximity?: {
    timeDifference: number // in milliseconds
    threshold: number // in milliseconds
    isWithinThreshold: boolean
  }
  ipMatch?: {
    isMatch: boolean
  }
  finalDecision: {
    isDuplicate: boolean
    reason: string
  }
  userAction?: {
    action: "submitted_anyway" | "cancelled" | "merged" | "marked_as_duplicate"
    timestamp: number
  }
}

// In-memory storage for logs (in a real app, this would be in a database)
const duplicateCheckLogs: DuplicateCheckLog[] = []

// Log a duplicate check
export function logDuplicateCheck(log: DuplicateCheckLog): void {
  duplicateCheckLogs.push(log)

  // In a real app, you might want to persist this to a database
  // or send it to a logging service
  console.log(
    `[Duplicate Check] ID: ${log.id}, Decision: ${log.finalDecision.isDuplicate ? "Duplicate" : "Not Duplicate"}, Reason: ${log.finalDecision.reason}`,
  )
}

// Get all logs
export function getDuplicateCheckLogs(): DuplicateCheckLog[] {
  return duplicateCheckLogs
}

// Get logs for a specific feedback item
export function getLogsForFeedback(feedbackId: number): DuplicateCheckLog[] {
  return duplicateCheckLogs.filter((log) => log.comparedWith.id === feedbackId)
}

// Get logs within a time range
export function getLogsByTimeRange(startTime: number, endTime: number): DuplicateCheckLog[] {
  return duplicateCheckLogs.filter((log) => log.timestamp >= startTime && log.timestamp <= endTime)
}

// Get logs by decision
export function getLogsByDecision(isDuplicate: boolean): DuplicateCheckLog[] {
  return duplicateCheckLogs.filter((log) => log.finalDecision.isDuplicate === isDuplicate)
}

// Log user action on a duplicate
export function logUserAction(
  logId: string,
  action: "submitted_anyway" | "cancelled" | "merged" | "marked_as_duplicate",
): void {
  const log = duplicateCheckLogs.find((l) => l.id === logId)
  if (log) {
    log.userAction = {
      action,
      timestamp: Date.now(),
    }
  }
}

// Calculate false positive rate
export function calculateFalsePositiveRate(): number {
  const duplicateDecisions = duplicateCheckLogs.filter((log) => log.finalDecision.isDuplicate)
  const falsePositives = duplicateDecisions.filter((log) => log.userAction?.action === "submitted_anyway")

  if (duplicateDecisions.length === 0) return 0
  return (falsePositives.length / duplicateDecisions.length) * 100
}

// Calculate false negative rate (requires manual feedback)
export function calculateFalseNegativeRate(manuallyMarkedDuplicates: number): number {
  const nonDuplicateDecisions = duplicateCheckLogs.filter((log) => !log.finalDecision.isDuplicate)

  if (nonDuplicateDecisions.length === 0) return 0
  return (manuallyMarkedDuplicates / nonDuplicateDecisions.length) * 100
}
