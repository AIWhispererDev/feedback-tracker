/**
 * Configuration for the duplicate detection system
 */

// Default configuration
export const DEFAULT_DUPLICATE_CONFIG = {
  // Similarity thresholds
  similarityThreshold: 65, // Lowered from 70 to catch more potential duplicates
  titleWeight: 0.7, // Increased title weight since titles are often more indicative
  descriptionWeight: 0.3, // Decreased description weight

  // Time-based detection
  timeThreshold: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
  timeProximityWeight: 0.2, // How much time proximity affects the final decision

  // IP-based detection
  checkIpAddress: true, // Whether to consider IP address in duplicate detection
  ipMatchWeight: 0.3, // How much IP matching affects the final decision

  // Algorithm selection
  algorithm: "multi" as "levenshtein" | "jaccard" | "cosine" | "multi",
  algorithmWeights: {
    levenshtein: 0.3,
    jaccard: 0.4,
    cosine: 0.3,
  },

  // Category-specific settings
  categorySettings: {
    // Example: different settings for different feedback categories
    bug: {
      similarityThreshold: 60,
      titleWeight: 0.6,
      descriptionWeight: 0.4,
    },
    feature: {
      similarityThreshold: 60, // Lower threshold for feature requests
      titleWeight: 0.8, // Higher title weight for feature requests
      descriptionWeight: 0.2,
    },
  },

  // Cross-category detection
  enableCrossCategoryDetection: true, // Whether to detect duplicates across different categories

  // Adaptive thresholds
  enableAdaptiveThresholds: true, // Whether to adjust thresholds based on feedback
  adaptationRate: 0.05, // How quickly thresholds adapt (0-1)

  // Logging and monitoring
  detailedLogging: true, // Whether to log detailed information about each check
  monitorPerformance: true, // Whether to track performance metrics

  // System behavior
  autoMergeDuplicates: false, // Whether to automatically merge duplicates
  notifyAdminsOnDuplicate: true, // Whether to notify admins when duplicates are detected

  // UI settings
  showSimilarityScores: true, // Whether to show similarity scores in the UI
  highlightSimilarText: true, // Whether to highlight similar text in the UI
}

// Current active configuration (can be modified at runtime)
let activeConfig = { ...DEFAULT_DUPLICATE_CONFIG }

// Get the current configuration
export function getDuplicateConfig() {
  return activeConfig
}

// Update the configuration
export function updateDuplicateConfig(newConfig: Partial<typeof DEFAULT_DUPLICATE_CONFIG>) {
  activeConfig = { ...activeConfig, ...newConfig }
  return activeConfig
}

// Reset to default configuration
export function resetDuplicateConfig() {
  activeConfig = { ...DEFAULT_DUPLICATE_CONFIG }
  return activeConfig
}

// Get category-specific configuration
export function getCategoryConfig(category?: string) {
  if (!category || !activeConfig.categorySettings[category as keyof typeof activeConfig.categorySettings]) {
    return activeConfig
  }

  return {
    ...activeConfig,
    ...activeConfig.categorySettings[category as keyof typeof activeConfig.categorySettings],
  }
}

// Adaptive threshold adjustment based on feedback
export function adjustThresholds(falsePositiveRate: number, falseNegativeRate: number) {
  if (!activeConfig.enableAdaptiveThresholds) return activeConfig

  const rate = activeConfig.adaptationRate

  // If false positives are high, increase threshold
  if (falsePositiveRate > 10) {
    activeConfig.similarityThreshold = Math.min(
      95,
      activeConfig.similarityThreshold + Math.round(rate * falsePositiveRate),
    )
  }

  // If false negatives are high, decrease threshold
  if (falseNegativeRate > 10) {
    activeConfig.similarityThreshold = Math.max(
      50,
      activeConfig.similarityThreshold - Math.round(rate * falseNegativeRate),
    )
  }

  return activeConfig
}
