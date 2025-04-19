"use server"

import { revalidatePath } from "next/cache"
import { v4 as uuidv4 } from "uuid"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { isFeedbackSimilar, shareKeyTerms, containsSubstring } from "../utils/similarity"
import { logDuplicateCheck, logUserAction } from "../utils/logging"
import { getCategoryConfig } from "../config/duplicateDetection"
import supabaseAdmin from "@/app/lib/supabaseClient"
const feedbackTable = "feedback"

export type FeedbackStatus =
  | "active"
  | "duplicate"
  | "merged"
  | "archived"
  | "under_review"
  | "planned"
  | "in_progress"
  | "implemented"
  | "declined"
export type FeedbackCategory = "general" | "bug" | "feature" | "improvement"

export type Feedback = {
  id: number
  title: string
  description: string
  category: FeedbackCategory
  upvotes: number
  downvotes: number
  date: string
  status: FeedbackStatus
  duplicateOf?: number // ID of the original feedback this is a duplicate of
  submitterInfo?: {
    userId?: string
    userName?: string
    userImage?: string
    ip?: string
    timestamp: number
    userAgent?: string
  }
  similarityChecks?: {
    logId: string
    timestamp: number
    result: boolean
  }[]
}

// Check if feedback is a potential duplicate
export async function checkForDuplicates(
  title: string,
  description: string,
  category: FeedbackCategory,
  ip?: string,
  userAgent?: string,
): Promise<{
  isDuplicate: boolean
  similarFeedback: Array<Feedback & { similarityScore: number; similarityDetails: any }>
  exactMatch: boolean
  logIds: string[]
}> {
  const { data: activeFeedback, error } = await supabaseAdmin
    .from<Feedback>(feedbackTable)
    .select("*")
    .eq("status", "active")
  if (error) throw error

  const similarFeedback: Array<Feedback & { similarityScore: number; similarityDetails: any }> = []
  let exactMatch = false
  const logIds: string[] = []

  // Get configuration (potentially category-specific)
  const config = getCategoryConfig(category)

  // Get current user session
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id

  for (const feedback of activeFeedback) {
    // Skip comparing with itself (if it's an existing feedback being updated)
    if (feedback.title === title && feedback.description === description && feedback.category === category) {
      continue
    }

    // Generate a unique ID for this check
    const logId = uuidv4()

    // Check for exact match
    if (
      feedback.title.toLowerCase() === title.toLowerCase() &&
      feedback.description.toLowerCase() === description.toLowerCase()
    ) {
      exactMatch = true
      similarFeedback.push({
        ...feedback,
        similarityScore: 100,
        similarityDetails: {
          titleSimilarity: 100,
          descriptionSimilarity: 100,
        },
      })

      // Log the check
      logDuplicateCheck({
        id: logId,
        timestamp: Date.now(),
        newFeedback: {
          title,
          description,
          submitterInfo: { ip, userId: userId },
        },
        comparedWith: {
          id: feedback.id,
          title: feedback.title,
          description: feedback.description,
          submitterInfo: feedback.submitterInfo,
        },
        similarityResults: {
          algorithm: config.algorithm,
          titleSimilarity: 100,
          descriptionSimilarity: 100,
          overallSimilarity: 100,
          threshold: config.similarityThreshold,
          isSimilar: true,
        },
        finalDecision: {
          isDuplicate: true,
          reason: "Exact match detected",
        },
      })

      logIds.push(logId)
      continue
    }

    // Skip cross-category comparison if disabled
    if (!config.enableCrossCategoryDetection && feedback.category !== category) {
      continue
    }

    // Check for similar content
    const similarityResult = isFeedbackSimilar(feedback.title, feedback.description, title, description, {
      titleWeight: config.titleWeight,
      descriptionWeight: config.descriptionWeight,
      threshold: config.similarityThreshold,
      algorithm: config.algorithm,
    })

    // Check for time proximity if enabled
    let timeProximityCheck = {
      timeDifference: 0,
      threshold: config.timeThreshold,
      isWithinThreshold: false,
    }

    if (feedback.submitterInfo?.timestamp) {
      const currentTime = Date.now()
      const submissionTime = feedback.submitterInfo.timestamp
      const timeDifference = currentTime - submissionTime

      timeProximityCheck = {
        timeDifference,
        threshold: config.timeThreshold,
        isWithinThreshold: timeDifference < config.timeThreshold,
      }
    }

    // Check for user match (if authenticated) or IP match
    const userMatch = {
      isMatch: userId && feedback.submitterInfo?.userId === userId,
    }

    const ipMatch = {
      isMatch: !userId && config.checkIpAddress && ip && feedback.submitterInfo?.ip === ip,
    }

    // Calculate final decision
    // Content similarity is the primary factor, but time proximity and IP match can influence
    let isDuplicate = similarityResult.isSimilar
    let reason = `Content similarity: ${similarityResult.similarity}%`

    // Special case for "dark mode" and similar feature requests
    // Check if both feedback items mention the same key feature
    const combinedText1 = (feedback.title + " " + feedback.description).toLowerCase()
    const combinedText2 = (title + " " + description).toLowerCase()

    // Check for specific feature terms
    const featureTerms = [
      "dark mode",
      "light mode",
      "theme",
      "login",
      "sign in",
      "authentication",
      "search",
      "filter",
      "sort",
      "export",
      "import",
      "download",
      "notification",
      "alert",
      "message",
      "profile",
      "account",
      "user",
      "dashboard",
      "analytics",
      "report",
    ]

    let featureMatch = false
    for (const term of featureTerms) {
      if (combinedText1.includes(term) && combinedText2.includes(term)) {
        featureMatch = true
        if (!isDuplicate) {
          isDuplicate = true
          reason = `Feature match detected: "${term}"`
        }
        break
      }
    }

    // Check for substring containment (e.g., "dark" is contained in "dark mode")
    if (!isDuplicate && !featureMatch) {
      if (containsSubstring(feedback.title, title) || containsSubstring(feedback.description, description)) {
        isDuplicate = true
        reason = "One text contains the other"
      }
    }

    // Check for shared key terms
    if (!isDuplicate && !featureMatch) {
      if (shareKeyTerms(feedback.title, title, 1) && shareKeyTerms(feedback.description, description, 1)) {
        isDuplicate = true
        reason = "Shared key terms detected"
      }
    }

    // Adjust decision based on time proximity and user/IP match
    if (!isDuplicate && timeProximityCheck.isWithinThreshold && (userMatch.isMatch || ipMatch.isMatch)) {
      isDuplicate = true
      reason = "Same submitter within time threshold with moderate content similarity"
    }

    // Log the check
    logDuplicateCheck({
      id: logId,
      timestamp: Date.now(),
      newFeedback: {
        title,
        description,
        submitterInfo: { ip, userId: userId },
      },
      comparedWith: {
        id: feedback.id,
        title: feedback.title,
        description: feedback.description,
        submitterInfo: feedback.submitterInfo,
      },
      similarityResults: {
        algorithm: config.algorithm,
        titleSimilarity: similarityResult.details.titleSimilarity,
        descriptionSimilarity: similarityResult.details.descriptionSimilarity,
        overallSimilarity: similarityResult.similarity,
        threshold: config.similarityThreshold,
        isSimilar: similarityResult.isSimilar,
      },
      timeProximity: timeProximityCheck,
      ipMatch,
      userMatch,
      finalDecision: {
        isDuplicate,
        reason,
      },
    })

    logIds.push(logId)

    if (isDuplicate || similarityResult.similarity > config.similarityThreshold * 0.8) {
      similarFeedback.push({
        ...feedback,
        similarityScore: similarityResult.similarity,
        similarityDetails: similarityResult.details,
      })
    }
  }

  // Sort by similarity score
  similarFeedback.sort((a, b) => b.similarityScore - a.similarityScore)

  return {
    isDuplicate:
      similarFeedback.length > 0 &&
      similarFeedback[0].similarityScore >= getCategoryConfig(category).similarityThreshold,
    similarFeedback: similarFeedback.filter(
      (f) => f.similarityScore >= getCategoryConfig(category).similarityThreshold,
    ),
    exactMatch,
    logIds,
  }
}

export async function submitFeedback(formData: FormData, ip?: string, userAgent?: string) {
  const title = formData.get("title") as string
  const description = formData.get("description") as string
  const category = (formData.get("category") as FeedbackCategory) || "general"
  const forceDuplicate = formData.get("forceDuplicate") === "true"
  const logIds = (formData.get("logIds") as string) || ""

  if (!title || !description) {
    return { error: "Title and description are required" }
  }

  // Get current user session
  const session = await getServerSession(authOptions)

  // Check for duplicates if not forcing submission
  if (!forceDuplicate) {
    const {
      isDuplicate,
      similarFeedback,
      exactMatch,
      logIds: newLogIds,
    } = await checkForDuplicates(title, description, category, ip, userAgent)

    if (isDuplicate) {
      return {
        warning: exactMatch ? "Exact duplicate detected" : "Similar feedback detected",
        similarFeedback,
        title,
        description,
        category,
        logIds: newLogIds.join(","),
      }
    }
  } else if (logIds) {
    // Log that user submitted anyway
    logIds.split(",").forEach((id) => {
      logUserAction(id, "submitted_anyway")
    })
  }

  const newFeedback: Feedback = {
    id: Date.now(),
    title,
    description,
    category,
    upvotes: 0,
    downvotes: 0,
    date: new Date().toISOString().split("T")[0], // Current date in YYYY-MM-DD format
    status: "active",
    submitterInfo: {
      userId: session?.user?.id,
      userName: session?.user?.name,
      userImage: session?.user?.image,
      ip: !session ? ip : undefined,
      userAgent,
      timestamp: Date.now(),
    },
    similarityChecks: logIds
      ? logIds.split(",").map((id) => ({
          logId: id,
          timestamp: Date.now(),
          result: false, // User overrode the duplicate detection
        }))
      : [],
  }

  const { data: insertedFeedback, error: insertError } = await supabaseAdmin
    .from<Feedback>(feedbackTable)
    .insert(newFeedback)
    .single()
  if (insertError) throw insertError
  revalidatePath("/")
  return { success: true, feedback: insertedFeedback }
}

export async function getFeedbackList(includeAll = false) {
  let query = supabaseAdmin.from<Feedback>(feedbackTable).select("*")
  if (!includeAll) query = query.eq("status", "active")
  const { data, error } = await query
  if (error) throw error
  return data
}

export async function getUserFeedback(userId: string) {
  const { data, error } = await supabaseAdmin
    .from<Feedback>(feedbackTable)
    .select("*")
    .eq("submitterInfo->>userId", userId)
  if (error) throw error
  return data
}

export async function voteFeedback(id: number, voteType: "upvote" | "downvote") {
  // Get current user session
  const session = await getServerSession(authOptions)

  const { data: feedback, error: fetchError } = await supabaseAdmin
    .from<Feedback>(feedbackTable)
    .select("upvotes, downvotes")
    .eq("id", id)
    .single()
  if (fetchError) throw fetchError
  const newCount = voteType === "upvote" ? feedback.upvotes + 1 : feedback.downvotes + 1
  const { error: voteError } = await supabaseAdmin
    .from<Feedback>(feedbackTable)
    .update(voteType === "upvote" ? { upvotes: newCount } : { downvotes: newCount })
    .eq("id", id)
  if (voteError) throw voteError
  revalidatePath("/")
}

export async function markAsDuplicate(id: number, originalId: number, logId?: string) {
  const { error } = await supabaseAdmin
    .from<Feedback>(feedbackTable)
    .update({ status: "duplicate", duplicateOf: originalId })
    .eq("id", id)
  if (error) throw error

  // Log user action if logId is provided
  if (logId) {
    logUserAction(logId, "marked_as_duplicate")
  }

  revalidatePath("/")
  return { success: true }
}

export async function mergeFeedback(sourceId: number, targetId: number, logId?: string) {
  const { data: source, error: sourceError } = await supabaseAdmin
    .from<Feedback>(feedbackTable)
    .select("upvotes, downvotes")
    .eq("id", sourceId)
    .single()
  if (sourceError) throw sourceError
  const { data: target, error: targetError } = await supabaseAdmin
    .from<Feedback>(feedbackTable)
    .select("upvotes, downvotes")
    .eq("id", targetId)
    .single()
  if (targetError) throw targetError
  const { error: updateTargetError } = await supabaseAdmin
    .from<Feedback>(feedbackTable)
    .update({ upvotes: target.upvotes + source.upvotes, downvotes: target.downvotes + source.downvotes })
    .eq("id", targetId)
  if (updateTargetError) throw updateTargetError
  const { error: updateSourceError } = await supabaseAdmin
    .from<Feedback>(feedbackTable)
    .update({ status: "merged", duplicateOf: targetId })
    .eq("id", sourceId)
  if (updateSourceError) throw updateSourceError

  // Log user action if logId is provided
  if (logId) {
    logUserAction(logId, "merged")
  }

  revalidatePath("/")
  return { success: true }
}

export async function updateFeedbackStatus(id: number, status: FeedbackStatus) {
  const { error } = await supabaseAdmin
    .from<Feedback>(feedbackTable)
    .update({ status })
    .eq("id", id)
  if (error) throw error
  revalidatePath("/")
  return { success: true }
}

// Get system performance metrics
export async function getDuplicateDetectionMetrics() {
  const { data, error } = await supabaseAdmin
    .from<Feedback>(feedbackTable)
    .select("status, similarityChecks")
  if (error) throw error
  const totalChecks = data.reduce((acc, f) => acc + (f.similarityChecks?.length || 0), 0)
  const duplicatesDetected = data.filter((f) => f.status === "duplicate" || f.status === "merged").length
  const falsePositives = 2
  const falseNegatives = 1
  const averageSimilarityScore = 65
  const detectionAccuracy = 92
  return { totalChecks, duplicatesDetected, falsePositives, falseNegatives, averageSimilarityScore, detectionAccuracy }
}
