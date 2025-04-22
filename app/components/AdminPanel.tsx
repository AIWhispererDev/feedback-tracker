"use client";

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
// Removed tabs import as we're using custom tabs
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend
} from "recharts"
// Removed chart components import as we're using direct Recharts components
import {
  getFeedbackList,
  markAsDuplicate,
  changeFeedbackStatus,
  getDuplicateDetectionMetrics,
} from "../actions/feedback"
import { getDuplicateConfig, updateDuplicateConfig, resetDuplicateConfig } from "../config/duplicateDetection"
import type { Feedback } from "../actions/feedback"
import { UserManagement } from "./UserManagement"

export function AdminPanel() {
  const [feedbackList, setFeedbackList] = useState<Feedback[]>([])
  const [duplicateConfig, setDuplicateConfig] = useState(getDuplicateConfig())
  const [searchTerm, setSearchTerm] = useState("")
  const [filteredList, setFilteredList] = useState<Feedback[]>([])
  const [metrics, setMetrics] = useState<any>(null)
  const [activeTab, setActiveTab] = useState("duplicates")
  const [selectedAlgorithm, setSelectedAlgorithm] = useState(duplicateConfig.algorithm)
  const [selectedLog, setSelectedLog] = useState<number | null>(null)
  const [debugMode, setDebugMode] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    getFeedbackList(true).then((list) => {
      setFeedbackList(list)
      setFilteredList(list)
    })

    getDuplicateDetectionMetrics().then(setMetrics)
  }, [])

  useEffect(() => {
    if (searchTerm) {
      const filtered = feedbackList.filter(
        (item) =>
          item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.description.toLowerCase().includes(searchTerm.toLowerCase()),
      )
      setFilteredList(filtered)
    } else {
      setFilteredList(feedbackList)
    }
  }, [searchTerm, feedbackList])

  async function handleMarkAsDuplicate(id: number, originalId: number) {
    try {
      // Clear any previous error message
      setErrorMessage(null);
      
      // Ensure IDs are valid numbers
      const numericId = Number(id);
      const numericOriginalId = Number(originalId);
      
      if (isNaN(numericId) || isNaN(numericOriginalId)) {
        const errorMsg = `Invalid ID format: id=${id}, originalId=${originalId}`;
        console.error(errorMsg);
        setErrorMessage(errorMsg);
        return;
      }
      
      // Make sure we're not marking an item as a duplicate of itself
      if (numericId === numericOriginalId) {
        const errorMsg = "Cannot mark an item as a duplicate of itself";
        console.error(errorMsg);
        setErrorMessage(errorMsg);
        return;
      }
      
      console.log(`Marking feedback #${numericId} as duplicate of #${numericOriginalId}`);
      await markAsDuplicate(numericId, numericOriginalId);
      
      // Refresh the list
      const updatedList = await getFeedbackList(true);
      setFeedbackList(updatedList);
    } catch (error: any) {
      console.error("Error marking as duplicate:", error);
      
      // Extract and display the error message
      let errorMsg = "Unknown error occurred";
      if (error.message) {
        errorMsg = error.message;
      } else if (typeof error === 'string') {
        errorMsg = error;
      }
      
      setErrorMessage(errorMsg);
    }
  }

  async function handleStatusChange(id: number, status: "active" | "duplicate" | "merged" | "archived") {
    await changeFeedbackStatus(id, status)
    // Refresh the list
    const updatedList = await getFeedbackList(true)
    setFeedbackList(updatedList)
  }

  function handleConfigChange(key: string, value: any) {
    const newConfig = { ...duplicateConfig, [key]: value }
    setDuplicateConfig(newConfig)
    updateDuplicateConfig(newConfig)
  }

  function handleResetConfig() {
    const defaultConfig = resetDuplicateConfig()
    setDuplicateConfig(defaultConfig)
    setSelectedAlgorithm(defaultConfig.algorithm)
  }

  function handleAlgorithmChange(algorithm: "levenshtein" | "jaccard" | "cosine" | "multi") {
    setSelectedAlgorithm(algorithm)
    handleConfigChange("algorithm", algorithm)
  }

  // Group feedback by potential duplicates
  const duplicateGroups = findPotentialDuplicates(filteredList, 30) // Lower threshold for admin view to see more potential matches

  // Mock data for performance charts
  const performanceData = [
    { name: "Jan", accuracy: 85, falsePositives: 12, falseNegatives: 8 },
    { name: "Feb", accuracy: 87, falsePositives: 10, falseNegatives: 7 },
    { name: "Mar", accuracy: 89, falsePositives: 8, falseNegatives: 6 },
    { name: "Apr", accuracy: 91, falsePositives: 7, falseNegatives: 5 },
    { name: "May", accuracy: 92, falsePositives: 6, falseNegatives: 4 },
    { name: "Jun", accuracy: 94, falsePositives: 4, falseNegatives: 3 },
  ]

  // Category distribution data
  const categoryData = useMemo(() => {
    const counts: Record<string, number> = {}
    feedbackList.forEach((f) => {
      if (f.category) { // Check if category exists
        counts[f.category] = (counts[f.category] || 0) + 1
      }
    })
    return Object.entries(counts || {}).map(([category, count]) => ({ category, count }))
  }, [feedbackList])

  const sentimentData = useMemo(() => {
    let pos = 0, neu = 0, neg = 0
    feedbackList.forEach((f) => {
      const text = (f.title + " " + f.description).toLowerCase()
      if (/good|great|love/.test(text)) pos++
      else if (/bad|terrible|error|hate/.test(text)) neg++
      else neu++
    })
    return [
      { name: "Positive", value: pos },
      { name: "Neutral", value: neu },
      { name: "Negative", value: neg },
    ]
  }, [feedbackList])

  return (
    <div className="space-y-6">
      {/* Debug Error Display */}
      {errorMessage && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded relative mb-4">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{errorMessage}</span>
        </div>
      )}
      
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Feedback Administration</CardTitle>
              <CardDescription>Manage feedback submissions and duplicate detection settings</CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="debug-mode"
                checked={debugMode}
                onCheckedChange={setDebugMode}
              />
              <Label htmlFor="debug-mode">Debug Mode</Label>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Tab navigation with dropdown for mobile and tabs for desktop */}
          <div className="mb-6">
            {/* Mobile dropdown navigation */}
            <div className="md:hidden mb-4">
              <Select value={activeTab} onValueChange={setActiveTab}>
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {activeTab === "duplicates" && "Duplicate Management"}
                    {activeTab === "settings" && "Detection Settings"}
                    {activeTab === "performance" && "Performance Metrics"}
                    {activeTab === "dashboard" && "Dashboard"}
                    {activeTab === "logs" && "System Logs"}
                    {activeTab === "users" && "User Management"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="duplicates">Duplicate Management</SelectItem>
                  <SelectItem value="settings">Detection Settings</SelectItem>
                  <SelectItem value="performance">Performance Metrics</SelectItem>
                  <SelectItem value="dashboard">Dashboard</SelectItem>
                  <SelectItem value="logs">System Logs</SelectItem>
                  <SelectItem value="users">User Management</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Desktop tab navigation */}
            <div className="hidden md:block">
              <div className="flex flex-wrap gap-2 border-b border-border">
                <button
                  onClick={() => setActiveTab("duplicates")}
                  className={`px-4 py-2 font-medium text-sm rounded-t-lg transition-colors ${activeTab === "duplicates" ? "bg-primary text-primary-foreground" : "hover:bg-muted/60"}`}
                >
                  Duplicate Management
                </button>
                <button
                  onClick={() => setActiveTab("settings")}
                  className={`px-4 py-2 font-medium text-sm rounded-t-lg transition-colors ${activeTab === "settings" ? "bg-primary text-primary-foreground" : "hover:bg-muted/60"}`}
                >
                  Detection Settings
                </button>
                <button
                  onClick={() => setActiveTab("performance")}
                  className={`px-4 py-2 font-medium text-sm rounded-t-lg transition-colors ${activeTab === "performance" ? "bg-primary text-primary-foreground" : "hover:bg-muted/60"}`}
                >
                  Performance Metrics
                </button>
                <button
                  onClick={() => setActiveTab("dashboard")}
                  className={`px-4 py-2 font-medium text-sm rounded-t-lg transition-colors ${activeTab === "dashboard" ? "bg-primary text-primary-foreground" : "hover:bg-muted/60"}`}
                >
                  Dashboard
                </button>
                <button
                  onClick={() => setActiveTab("logs")}
                  className={`px-4 py-2 font-medium text-sm rounded-t-lg transition-colors ${activeTab === "logs" ? "bg-primary text-primary-foreground" : "hover:bg-muted/60"}`}
                >
                  System Logs
                </button>
                <button
                  onClick={() => setActiveTab("users")}
                  className={`px-4 py-2 font-medium text-sm rounded-t-lg transition-colors ${activeTab === "users" ? "bg-primary text-primary-foreground" : "hover:bg-muted/60"}`}
                >
                  User Management
                </button>
              </div>
            </div>
          </div>

          {/* Tab content */}
          <div>
            {/* Duplicate Management Tab */}
            {activeTab === "duplicates" && (
              <div className="space-y-4">
                <div className="space-y-4">
                  <div>
                    <Input
                      placeholder="Search feedback..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="mb-4 w-full sm:w-80"
                    />
                  </div>
                  {duplicateGroups.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No potential duplicates found
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {duplicateGroups.map((group, groupIndex) => (
                        <Card key={groupIndex}>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-lg">Potential Duplicate Group #{groupIndex + 1}</CardTitle>
                            <CardDescription>
                              {group.length} similar feedback items
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-4">
                              {group.map((item) => (
                                <div
                                  key={item.id}
                                  className="p-4 border rounded-lg bg-background"
                                >
                                  <div className="flex justify-between items-start mb-2">
                                    <div>
                                      <h3 className="font-medium">{item.title}</h3>
                                      <p className="text-sm text-muted-foreground">
                                        {new Date(item.created_at).toLocaleDateString()} - {item.category}
                                      </p>
                                    </div>
                                    <div className="flex space-x-2">
                                      <Select
                                        value={item.status}
                                        onValueChange={(value) =>
                                          handleStatusChange(
                                            item.id,
                                            value as "active" | "duplicate" | "merged" | "archived"
                                          )
                                        }
                                      >
                                        <SelectTrigger className="w-[130px]">
                                          <SelectValue placeholder="Status" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="active">Active</SelectItem>
                                          <SelectItem value="duplicate">Duplicate</SelectItem>
                                          <SelectItem value="merged">Merged</SelectItem>
                                          <SelectItem value="archived">Archived</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  </div>
                                  <p className="text-sm mb-4">{item.description}</p>
                                  <div className="flex flex-wrap gap-2">
                                    {group
                                      .filter((other) => other.id !== item.id)
                                      .map((other) => (
                                        <Button
                                          key={other.id}
                                          variant="outline"
                                          size="sm"
                                          onClick={() => handleMarkAsDuplicate(item.id, other.id)}
                                          className="text-xs"
                                        >
                                          Mark as duplicate of #{other.id}
                                        </Button>
                                      ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Detection Settings Tab */}
            {activeTab === "settings" && (
              <Card>
                <CardHeader>
                  <CardTitle>Duplicate Detection Settings</CardTitle>
                  <CardDescription>Configure how duplicate feedback is detected</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="algorithm">Detection Algorithm</Label>
                      <Select
                        value={selectedAlgorithm}
                        onValueChange={(value) =>
                          handleAlgorithmChange(value as "levenshtein" | "jaccard" | "cosine" | "multi")
                        }
                      >
                        <SelectTrigger id="algorithm" className="w-full">
                          <SelectValue placeholder="Select algorithm" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="levenshtein">Levenshtein Distance</SelectItem>
                          <SelectItem value="jaccard">Jaccard Similarity</SelectItem>
                          <SelectItem value="cosine">Cosine Similarity</SelectItem>
                          <SelectItem value="multi">Multi-algorithm</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-sm text-muted-foreground mt-1">
                        {selectedAlgorithm === "levenshtein"
                          ? "Compares edit distance between text strings"
                          : selectedAlgorithm === "jaccard"
                            ? "Measures similarity between sets"
                            : selectedAlgorithm === "cosine"
                              ? "Measures cosine of angle between vectors"
                              : "Uses multiple algorithms with weighted scoring"}
                      </p>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <Label htmlFor="threshold">Similarity Threshold ({duplicateConfig.threshold}%)</Label>
                      </div>
                      <Slider
                        id="threshold"
                        min={0}
                        max={100}
                        step={1}
                        value={[duplicateConfig.threshold]}
                        onValueChange={(value) => handleConfigChange("threshold", value[0])}
                        className="w-full"
                      />
                      <p className="text-sm text-muted-foreground mt-1">
                        Higher values require more similarity to be considered duplicates
                      </p>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="title-weight">Title Weight ({duplicateConfig.titleWeight})</Label>
                        <p className="text-sm text-muted-foreground">
                          Importance of title in similarity calculation
                        </p>
                      </div>
                      <Slider
                        id="title-weight"
                        min={0}
                        max={10}
                        step={0.1}
                        value={[duplicateConfig.titleWeight]}
                        onValueChange={(value) => handleConfigChange("titleWeight", value[0])}
                        className="w-[200px]"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="desc-weight">Description Weight ({duplicateConfig.descriptionWeight})</Label>
                        <p className="text-sm text-muted-foreground">
                          Importance of description in similarity calculation
                        </p>
                      </div>
                      <Slider
                        id="desc-weight"
                        min={0}
                        max={10}
                        step={0.1}
                        value={[duplicateConfig.descriptionWeight]}
                        onValueChange={(value) => handleConfigChange("descriptionWeight", value[0])}
                        className="w-[200px]"
                      />
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        id="auto-merge"
                        checked={duplicateConfig.autoMergeSimilar}
                        onCheckedChange={(checked) => handleConfigChange("autoMergeSimilar", checked)}
                      />
                      <Label htmlFor="auto-merge">Automatically merge very similar feedback</Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        id="use-ml"
                        checked={duplicateConfig.useMLModel}
                        onCheckedChange={(checked) => handleConfigChange("useMLModel", checked)}
                      />
                      <Label htmlFor="use-ml">Use machine learning model for detection</Label>
                    </div>

                    <Button onClick={handleResetConfig} variant="outline">
                      Reset to Defaults
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Performance Metrics Tab */}
            {activeTab === "performance" && (
              <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Detection Accuracy</CardTitle>
                    <CardDescription>Performance metrics over time</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={performanceData}
                          margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Line
                            type="monotone"
                            dataKey="accuracy"
                            stroke="#3b82f6"
                            activeDot={{ r: 8 }}
                          />
                          <Line type="monotone" dataKey="falsePositives" stroke="#ef4444" />
                          <Line type="monotone" dataKey="falseNegatives" stroke="#f97316" />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Algorithm Comparison</CardTitle>
                    <CardDescription>Performance by algorithm type</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={[
                            { name: "Accuracy", levenshtein: 88, jaccard: 85, cosine: 90, multi: 94 },
                            { name: "Speed (ms)", levenshtein: 120, jaccard: 150, cosine: 200, multi: 250 },
                            { name: "False Positives", levenshtein: 12, jaccard: 15, cosine: 8, multi: 5 },
                          ]}
                          margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="levenshtein" fill="#3b82f6" />
                          <Bar dataKey="jaccard" fill="#8b5cf6" />
                          <Bar dataKey="cosine" fill="#ec4899" />
                          <Bar dataKey="multi" fill="#10b981" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* System Logs Tab */}
            {activeTab === "logs" && (
              <Card>
                <CardHeader>
                  <CardTitle>System Logs</CardTitle>
                  <CardDescription>Recent duplicate detection system activity</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {metrics?.logs?.map((log: any, i: number) => (
                      <div
                        key={i}
                        className={`p-4 border rounded-lg ${
                          selectedLog === i ? "border-primary" : "border-border"
                        } cursor-pointer`}
                        onClick={() => setSelectedLog(selectedLog === i ? null : i)}
                      >
                        <div className="flex justify-between">
                          <div className="font-medium">{log.event}</div>
                          <div className="text-sm text-muted-foreground">
                            {new Date(log.timestamp).toLocaleString()}
                          </div>
                        </div>
                        {selectedLog === i && (
                          <div className="mt-2 text-sm">
                            <pre className="bg-muted p-2 rounded overflow-x-auto">
                              {JSON.stringify(log.details, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* User Management Tab */}
            {activeTab === "users" && (
              <UserManagement />
            )}

            {/* Dashboard Tab */}
            {activeTab === "dashboard" && (
              <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Feedback by Category</CardTitle>
                    <CardDescription>Distribution of feedback across categories</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={categoryData}
                          margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="category" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="count" fill="#3b82f6" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Sentiment Analysis</CardTitle>
                    <CardDescription>Feedback sentiment distribution</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={sentimentData}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius="80%"
                            label
                          >
                            {sentimentData.map((entry, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={["#10b981", "#fcd34d", "#ef4444"][index]}
                              />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter>
          <p className="text-xs text-gray-500">
            {activeTab === "settings"
              ? "Changes to settings will affect future duplicate detection only"
              : activeTab === "performance"
                ? "Performance metrics are updated daily"
                : activeTab === "logs"
                  ? "Logs are retained for 30 days"
                  : activeTab === "users"
                    ? "Manage user accounts and permissions"
                    : activeTab === "dashboard"
                      ? "Interactive dashboard for feedback insights"
                      : "Manage duplicate feedback entries and review potential matches"}
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}

// Helper function to find potential duplicate groups
function findPotentialDuplicates(feedbackList: Feedback[], threshold: number): Feedback[][] {
  const groups: Feedback[][] = []
  const processed = new Set<number>()

  for (let i = 0; i < feedbackList.length; i++) {
    if (processed.has(feedbackList[i].id)) continue

    const group: Feedback[] = [feedbackList[i]]
    processed.add(feedbackList[i].id)

    for (let j = i + 1; j < feedbackList.length; j++) {
      if (processed.has(feedbackList[j].id)) continue

      // Simple similarity check based on title
      const title1 = feedbackList[i].title.toLowerCase()
      const title2 = feedbackList[j].title.toLowerCase()

      // Calculate Levenshtein distance
      const maxLength = Math.max(title1.length, title2.length)
      if (maxLength === 0) continue

      const distance = levenshteinDistance(title1, title2)
      const similarity = ((maxLength - distance) / maxLength) * 100

      if (similarity >= threshold) {
        group.push(feedbackList[j])
        processed.add(feedbackList[j].id)
      }
    }

    if (group.length > 1) {
      groups.push(group)
    }
  }

  return groups
}

// Simple Levenshtein distance implementation
function levenshteinDistance(str1: string, str2: string): number {
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
