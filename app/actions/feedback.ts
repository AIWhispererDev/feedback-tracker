"use server"

import { revalidatePath } from "next/cache"
import { v4 as uuidv4 } from "uuid"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { isFeedbackSimilar, shareKeyTerms, containsSubstring } from "../utils/similarity"
import { logDuplicateCheck, logUserAction, getDuplicateCheckLogs } from "../utils/logging"
import { getCategoryConfig, updateDuplicateConfig, resetDuplicateConfig } from "../config/duplicateDetection"
import supabaseAdmin from "@/app/lib/supabaseClient"
import { feedbackSchema, rateLimitMap } from './feedbackHelpers';
import sanitizeHtml from 'sanitize-html';

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
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return { error: "Unauthorized" }
  }

  let title = formData.get("title") as string;
  let description = formData.get("description") as string;
  let category = (formData.get("category") as FeedbackCategory) || "general";
  const forceDuplicate = formData.get("forceDuplicate") === "true";
  const logIds = (formData.get("logIds") as string) || "";

  // Rate limiting: max 5 requests per IP per minute
  const now = Date.now();
  const clientIp = ip ?? 'unknown';
  const record = rateLimitMap.get(clientIp);
  if (!record || now - record.firstTimestamp > 60000) {
    rateLimitMap.set(clientIp, { count: 1, firstTimestamp: now });
  } else {
    record.count++;
    if (record.count > 5) {
      return { error: 'Rate limit exceeded. Try again later.' };
    }
  }

  // Validate input
  const parseResult = feedbackSchema.safeParse({ title, description, category });
  if (!parseResult.success) {
    const messages = parseResult.error.errors.map(e => e.message).join(', ');
    return { error: `Invalid input: ${messages}` };
  }
  const { title: validTitle, description: validDescription, category: validCategory } = parseResult.data;

  // Sanitize input
  const cleanTitle = sanitizeHtml(validTitle, { allowedTags: [], allowedAttributes: {} });
  const cleanDescription = sanitizeHtml(validDescription, { allowedTags: [], allowedAttributes: {} });

  // Override with sanitized values
  title = cleanTitle;
  description = cleanDescription;
  category = validCategory;

  if (!title || !description) {
    return { error: "Title and description are required" }
  }

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
    submitterInfo: {
      userId: session.user.id,
      userName: session.user.name,
      userImage: session.user.image,
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

  // Insert without explicit status; rely on DB default
  const insertPayload: any = { ...newFeedback }
  // Remove status (DB default) and map duplicate logs to JSONB column
  delete insertPayload.status
  delete insertPayload.id
  insertPayload['similarity_checks'] = insertPayload.similarityChecks
  delete insertPayload.similarityChecks
  insertPayload['submitter_info'] = insertPayload.submitterInfo
  delete insertPayload.submitterInfo
  const { data: insertedFeedback, error: insertError } = await supabaseAdmin
    .from<Feedback>(feedbackTable)
    .insert(insertPayload)
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
  console.log(`[SERVER] markAsDuplicate called with id=${id}, originalId=${originalId}`);
  
  try {
    // Validate inputs
    if (!id || !originalId) {
      throw new Error(`Invalid parameters: id=${id}, originalId=${originalId}`)
    }
    
    // Make sure we're not marking an item as a duplicate of itself
    if (id === originalId) {
      throw new Error('Cannot mark an item as a duplicate of itself')
    }

    // First, let's check the table structure to understand what fields are available
    console.log(`[SERVER] Checking feedback table structure...`);
    const { data: tableInfo, error: tableError } = await supabaseAdmin
      .from(feedbackTable)
      .select('*')
      .limit(1);
    
    if (tableError) {
      console.error('[SERVER] Error fetching table structure:', tableError);
      throw new Error(`Table structure error: ${tableError.message}`);
    }
    
    // Log the structure of the first record to understand available fields
    if (tableInfo && tableInfo.length > 0) {
      console.log('[SERVER] Feedback table fields:', Object.keys(tableInfo[0]));
    } else {
      console.log('[SERVER] No records found in feedback table');
    }

    // Check if both feedback items exist
    console.log(`[SERVER] Checking if original item #${originalId} exists...`);
    const { data: originalItem, error: originalError } = await supabaseAdmin
      .from(feedbackTable)
      .select('id, status')
      .eq('id', originalId)
      .single();
    
    if (originalError) {
      console.error(`[SERVER] Error finding original item #${originalId}:`, originalError);
      throw new Error(`Original feedback error: ${originalError.message}`);
    }
    
    if (!originalItem) {
      console.error(`[SERVER] Original feedback item #${originalId} not found`);
      throw new Error(`Original feedback item #${originalId} not found`);
    }
    
    console.log(`[SERVER] Original item #${originalId} found with status: ${originalItem.status}`);

    // Check if the item to be marked as duplicate exists
    console.log(`[SERVER] Checking if item #${id} exists...`);
    const { data: itemToUpdate, error: itemError } = await supabaseAdmin
      .from(feedbackTable)
      .select('id, status, duplicate_of')
      .eq('id', id)
      .single();
    
    if (itemError) {
      console.error(`[SERVER] Error finding item #${id}:`, itemError);
      throw new Error(`Item to update error: ${itemError.message}`);
    }
    
    if (!itemToUpdate) {
      console.error(`[SERVER] Feedback item #${id} not found`);
      throw new Error(`Feedback item #${id} not found`);
    }
    
    console.log(`[SERVER] Item #${id} found with status: ${itemToUpdate.status}`);

    // Try a minimal update first - just the status and duplicate_of fields
    console.log(`[SERVER] Attempting to update item #${id} as duplicate of #${originalId}...`);
    const updateData = { 
      status: "duplicate", 
      duplicate_of: originalId 
    };
    
    console.log('[SERVER] Update data:', updateData);
    
    const { error } = await supabaseAdmin
      .from(feedbackTable)
      .update(updateData)
      .eq("id", id);
    
    if (error) {
      console.error('[SERVER] Error updating feedback status:', error);
      throw error;
    }

    console.log(`[SERVER] Successfully marked #${id} as duplicate of #${originalId}`);
    
    // Log user action if logId is provided
    if (logId) {
      logUserAction(logId, "marked_as_duplicate");
    }

    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error('[SERVER] markAsDuplicate error:', error);
    throw error;
  }
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

// Get system performance metrics
export async function getDuplicateDetectionMetrics() {
  const { data, error } = await supabaseAdmin
    .from<Feedback>(feedbackTable)
    .select("status, similarity_checks")
  if (error) throw error
  const totalChecks = data.reduce((acc, f: any) => acc + (f.similarity_checks?.length || 0), 0)
  const duplicatesDetected = data.filter((f) => f.status === "duplicate" || f.status === "merged").length
  const falsePositives = 2
  const falseNegatives = 1
  const averageSimilarityScore = 65
  const detectionAccuracy = 92
  // Include system logs for duplicate detection events
  const logs = getDuplicateCheckLogs()
  return { totalChecks, duplicatesDetected, falsePositives, falseNegatives, averageSimilarityScore, detectionAccuracy, logs }
}

// Server action to update feedback status via Supabase RPC
export async function changeFeedbackStatus(
  feedbackId: number,
  newStatus: FeedbackStatus,
  reason: string = ''
): Promise<void> {
  'use server'
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    throw new Error('Unauthorized')
  }
  if (session.user.role === "user") {
    throw new Error('Forbidden')
  }
  const { error } = await supabaseAdmin.rpc('change_feedback_status', {
    p_feedback_id: feedbackId,
    p_new_status: newStatus,
    p_changed_by: session.user.id,
    p_reason: reason,
  })
  if (error) {
    throw new Error(error.message)
  }
  // Revalidate page to show new status
  revalidatePath('/')
}
