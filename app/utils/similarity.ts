/**
 * Enhanced similarity detection utilities with multiple algorithms
 * and improved accuracy for feedback duplicate detection
 */

// Calculate Levenshtein distance between two strings
export function levenshteinDistance(str1: string, str2: string): number {
  const track = Array(str2.length + 1)
    .fill(null)
    .map(() => Array(str1.length + 1).fill(null))

  for (let i = 0; i <= str1.length; i += 1) {
    track[0][i] = i
  }

  for (let j = 0; j <= str2.length; j += 1) {
    track[j][0] = j
  }

  for (let j = 1; j <= str2.length; j += 1) {
    for (let i = 1; i <= str1.length; i += 1) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1
      track[j][i] = Math.min(
        track[j][i - 1] + 1, // deletion
        track[j - 1][i] + 1, // insertion
        track[j - 1][i - 1] + indicator, // substitution
      )
    }
  }

  return track[str2.length][str1.length]
}

// Calculate Jaccard similarity between two strings
// Measures similarity between finite sample sets
export function jaccardSimilarity(str1: string, str2: string): number {
  // Convert strings to sets of words
  const words1 = new Set(str1.toLowerCase().split(/\s+/).filter(Boolean))
  const words2 = new Set(str2.toLowerCase().split(/\s+/).filter(Boolean))

  if (words1.size === 0 && words2.size === 0) return 1
  if (words1.size === 0 || words2.size === 0) return 0

  // Calculate intersection
  const intersection = new Set([...words1].filter((x) => words2.has(x)))

  // Calculate union
  const union = new Set([...words1, ...words2])

  return intersection.size / union.size
}

// Calculate cosine similarity between two strings
// Better for comparing documents of different lengths
export function cosineSimilarity(str1: string, str2: string): number {
  // Tokenize and count word frequencies
  const words1 = str1.toLowerCase().split(/\s+/).filter(Boolean)
  const words2 = str2.toLowerCase().split(/\s+/).filter(Boolean)

  if (words1.length === 0 && words2.length === 0) return 1
  if (words1.length === 0 || words2.length === 0) return 0

  // Create term frequency maps
  const freqMap1: Record<string, number> = {}
  const freqMap2: Record<string, number> = {}

  words1.forEach((word) => {
    freqMap1[word] = (freqMap1[word] || 0) + 1
  })

  words2.forEach((word) => {
    freqMap2[word] = (freqMap2[word] || 0) + 1
  })

  // Get all unique words
  const uniqueWords = new Set([...Object.keys(freqMap1), ...Object.keys(freqMap2)])

  // Calculate dot product
  let dotProduct = 0
  let magnitude1 = 0
  let magnitude2 = 0

  uniqueWords.forEach((word) => {
    const freq1 = freqMap1[word] || 0
    const freq2 = freqMap2[word] || 0

    dotProduct += freq1 * freq2
    magnitude1 += freq1 * freq1
    magnitude2 += freq2 * freq2
  })

  magnitude1 = Math.sqrt(magnitude1)
  magnitude2 = Math.sqrt(magnitude2)

  if (magnitude1 === 0 || magnitude2 === 0) return 0

  return dotProduct / (magnitude1 * magnitude2)
}

// Calculate similarity percentage between two strings using Levenshtein
export function calculateLevenshteinSimilarity(str1: string, str2: string): number {
  if (str1.length === 0 && str2.length === 0) return 100
  if (str1.length === 0 || str2.length === 0) return 0

  const distance = levenshteinDistance(str1.toLowerCase(), str2.toLowerCase())
  const maxLength = Math.max(str1.length, str2.length)
  const similarity = ((maxLength - distance) / maxLength) * 100

  return Math.round(similarity)
}

// Detect common prefixes/suffixes that might indicate duplicates
export function hasCommonPhrases(str1: string, str2: string, minLength = 5): boolean {
  const s1 = str1.toLowerCase()
  const s2 = str2.toLowerCase()

  // Check for common prefix
  let i = 0
  while (i < Math.min(s1.length, s2.length) && s1[i] === s2[i]) {
    i++
  }

  if (i >= minLength) return true

  // Check for common suffix
  let j = 0
  while (j < Math.min(s1.length, s2.length) && s1[s1.length - 1 - j] === s2[s2.length - 1 - j]) {
    j++
  }

  if (j >= minLength) return true

  return false
}

// Check if one string contains the other
export function containsSubstring(str1: string, str2: string): boolean {
  const s1 = str1.toLowerCase()
  const s2 = str2.toLowerCase()

  return s1.includes(s2) || s2.includes(s1)
}

// Extract key terms from text
export function extractKeyTerms(text: string): string[] {
  // Simple implementation - split by spaces and filter out common words
  const commonWords = new Set([
    "a",
    "an",
    "the",
    "and",
    "or",
    "but",
    "in",
    "on",
    "at",
    "to",
    "for",
    "with",
    "by",
    "about",
    "like",
    "through",
    "over",
    "before",
    "between",
    "after",
    "since",
    "without",
    "under",
    "within",
    "along",
    "following",
    "across",
    "behind",
    "beyond",
    "plus",
    "except",
    "but",
    "up",
    "out",
    "around",
    "down",
    "off",
    "above",
    "near",
    "is",
    "are",
    "was",
    "were",
    "be",
    "been",
    "being",
    "have",
    "has",
    "had",
    "do",
    "does",
    "did",
    "will",
    "would",
    "shall",
    "should",
    "may",
    "might",
    "must",
    "can",
    "could",
    "of",
    "that",
    "this",
    "these",
    "those",
    "it",
    "its",
    "it's",
    "they",
    "them",
    "their",
    "theirs",
    "we",
    "us",
    "our",
    "ours",
    "you",
    "your",
    "yours",
    "he",
    "him",
    "his",
    "she",
    "her",
    "hers",
  ])

  return text
    .toLowerCase()
    .split(/\s+/)
    .filter((word) => word.length > 2 && !commonWords.has(word))
    .map((word) => word.replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, ""))
}

// Check if two texts share key terms
export function shareKeyTerms(str1: string, str2: string, minSharedTerms = 1): boolean {
  const terms1 = extractKeyTerms(str1)
  const terms2 = extractKeyTerms(str2)

  // Count shared terms
  const sharedTerms = terms1.filter((term) => terms2.includes(term))

  return sharedTerms.length >= minSharedTerms
}

// Multi-algorithm similarity check
export function calculateMultiAlgorithmSimilarity(
  str1: string,
  str2: string,
  weights = { levenshtein: 0.3, jaccard: 0.4, cosine: 0.3 },
): number {
  // Normalize weights
  const sum = weights.levenshtein + weights.jaccard + weights.cosine
  const normalizedWeights = {
    levenshtein: weights.levenshtein / sum,
    jaccard: weights.jaccard / sum,
    cosine: weights.cosine / sum,
  }

  // Calculate individual similarities
  const levenshteinSim = calculateLevenshteinSimilarity(str1, str2) / 100
  const jaccardSim = jaccardSimilarity(str1, str2)
  const cosineSim = cosineSimilarity(str1, str2)

  // Weighted average
  const weightedSimilarity =
    levenshteinSim * normalizedWeights.levenshtein +
    jaccardSim * normalizedWeights.jaccard +
    cosineSim * normalizedWeights.cosine

  // Boost similarity for special cases
  let boost = 0

  // Boost if common phrases are detected
  if (hasCommonPhrases(str1, str2)) {
    boost += 0.1
  }

  // Boost if one string contains the other
  if (containsSubstring(str1, str2)) {
    boost += 0.2
  }

  // Boost if they share key terms
  if (shareKeyTerms(str1, str2, 1)) {
    boost += 0.15
  }

  // Special case for short texts with shared key terms
  if (str1.length < 30 && str2.length < 30 && shareKeyTerms(str1, str2, 1)) {
    boost += 0.2
  }

  // Ensure result is between 0 and 1
  return Math.min(1, Math.max(0, weightedSimilarity + boost)) * 100
}

// Check if two feedback items are similar based on title and description
export function isFeedbackSimilar(
  title1: string,
  desc1: string,
  title2: string,
  desc2: string,
  config: {
    titleWeight: number
    descriptionWeight: number
    threshold: number
    algorithm: "levenshtein" | "jaccard" | "cosine" | "multi"
  },
): {
  isSimilar: boolean
  similarity: number
  details: {
    titleSimilarity: number
    descriptionSimilarity: number
  }
} {
  let titleSimilarity: number
  let descriptionSimilarity: number

  // Calculate similarities based on selected algorithm
  switch (config.algorithm) {
    case "jaccard":
      titleSimilarity = jaccardSimilarity(title1, title2) * 100
      descriptionSimilarity = jaccardSimilarity(desc1, desc2) * 100
      break
    case "cosine":
      titleSimilarity = cosineSimilarity(title1, title2) * 100
      descriptionSimilarity = cosineSimilarity(desc1, desc2) * 100
      break
    case "multi":
      titleSimilarity = calculateMultiAlgorithmSimilarity(title1, title2)
      descriptionSimilarity = calculateMultiAlgorithmSimilarity(desc1, desc2)
      break
    case "levenshtein":
    default:
      titleSimilarity = calculateLevenshteinSimilarity(title1, title2)
      descriptionSimilarity = calculateLevenshteinSimilarity(desc1, desc2)
  }

  // Normalize weights
  const totalWeight = config.titleWeight + config.descriptionWeight
  const normalizedTitleWeight = config.titleWeight / totalWeight
  const normalizedDescWeight = config.descriptionWeight / totalWeight

  // Calculate weighted similarity
  let overallSimilarity = titleSimilarity * normalizedTitleWeight + descriptionSimilarity * normalizedDescWeight

  // Special case for "dark mode" or other common feature requests
  // This helps catch duplicates with different wording but same core concept
  const combinedText1 = (title1 + " " + desc1).toLowerCase()
  const combinedText2 = (title2 + " " + desc2).toLowerCase()

  // List of common feature request terms to check for
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

  // Check if both texts contain the same feature term
  for (const term of featureTerms) {
    if (combinedText1.includes(term) && combinedText2.includes(term)) {
      // Boost similarity for matching feature terms
      overallSimilarity = Math.max(overallSimilarity, 75)
      break
    }
  }

  return {
    isSimilar: overallSimilarity >= config.threshold,
    similarity: Math.round(overallSimilarity),
    details: {
      titleSimilarity: Math.round(titleSimilarity),
      descriptionSimilarity: Math.round(descriptionSimilarity),
    },
  }
}
