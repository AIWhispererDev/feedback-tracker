"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
} from "recharts"
import {
  getFeedbackList,
  markAsDuplicate,
  updateFeedbackStatus,
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
    await markAsDuplicate(id, originalId)
    // Refresh the list
    const updatedList = await getFeedbackList(true)
    setFeedbackList(updatedList)
  }

  async function handleStatusChange(id: number, status: "active" | "duplicate" | "merged" | "archived") {
    await updateFeedbackStatus(id, status)
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

  // Mock data for algorithm comparison
  const algorithmComparisonData = [
    { name: "Levenshtein", accuracy: 88, speed: 95, falsePositives: 8 },
    { name: "Jaccard", accuracy: 91, speed: 92, falsePositives: 6 },
    { name: "Cosine", accuracy: 93, speed: 88, falsePositives: 5 },
    { name: "Multi-algorithm", accuracy: 96, speed: 85, falsePositives: 3 },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      <Card>
        <CardHeader>
          <CardTitle>Feedback Administration</CardTitle>
          <CardDescription>Manage feedback submissions and duplicate detection settings</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="duplicates">Duplicate Management</TabsTrigger>
              <TabsTrigger value="settings">Detection Settings</TabsTrigger>
              <TabsTrigger value="performance">Performance Metrics</TabsTrigger>
              <TabsTrigger value="logs">System Logs</TabsTrigger>
              <TabsTrigger value="users">User Management</TabsTrigger>
            </TabsList>

            <TabsContent value="duplicates">
              <div className="space-y-4">
                <div>
                  <Input
                    placeholder="Search feedback..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="mb-4"
                  />
                </div>

                <h3 className="text-lg font-medium">Potential Duplicate Groups</h3>
                {duplicateGroups.length === 0 ? (
                  <p className="text-gray-500">No potential duplicates found with current settings.</p>
                ) : (
                  duplicateGroups.map((group, groupIndex) => (
                    <Card
                      key={groupIndex}
                      className="mb-4 border border-border bg-card/90 dark:bg-card/80 shadow-sm hover:bg-accent/40 dark:hover:bg-accent/10 transition-colors"
                    >
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base font-semibold text-primary">
                          Potential Duplicate Group #{groupIndex + 1}
                        </CardTitle>
                        <CardDescription>
                          {group.map((item) => (
                            <span key={item.id} className="inline-block mr-2 text-xs text-muted-foreground">
                              #{item.id}
                            </span>
                          ))}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {group.map((item) => (
                          <div
                            key={item.id}
                            className="border border-border bg-muted/80 dark:bg-muted/40 rounded-lg p-3 flex flex-col gap-1 shadow-sm hover:bg-accent/60 dark:hover:bg-accent/30 transition-colors"
                          >
                            <span className="font-medium text-sm text-foreground">{item.title}</span>
                            <span className="text-xs text-muted-foreground">{item.description}</span>
                            <span className="text-xs text-accent-foreground">Status: {item.status}</span>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="settings">
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Similarity Detection</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <Label htmlFor="similarity-threshold">
                            Similarity Threshold: {duplicateConfig.similarityThreshold}%
                          </Label>
                        </div>
                        <Slider
                          id="similarity-threshold"
                          min={50}
                          max={95}
                          step={5}
                          value={[duplicateConfig.similarityThreshold]}
                          onValueChange={(value) => handleConfigChange("similarityThreshold", value[0])}
                        />
                        <p className="text-xs text-gray-500">
                          Higher values require more similarity to flag as duplicates
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label>Detection Algorithm</Label>
                        <Select value={selectedAlgorithm} onValueChange={handleAlgorithmChange}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select algorithm" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="levenshtein">Levenshtein Distance</SelectItem>
                            <SelectItem value="jaccard">Jaccard Similarity</SelectItem>
                            <SelectItem value="cosine">Cosine Similarity</SelectItem>
                            <SelectItem value="multi">Multi-algorithm</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-gray-500">
                          {selectedAlgorithm === "levenshtein" && "Best for short text and typo detection"}
                          {selectedAlgorithm === "jaccard" && "Best for comparing sets of words, ignores word order"}
                          {selectedAlgorithm === "cosine" && "Best for longer text, considers word frequency"}
                          {selectedAlgorithm === "multi" && "Combines multiple algorithms for best accuracy"}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="title-weight">Title Weight: {duplicateConfig.titleWeight * 100}%</Label>
                          <Slider
                            id="title-weight"
                            min={0}
                            max={1}
                            step={0.1}
                            value={[duplicateConfig.titleWeight]}
                            onValueChange={(value) => handleConfigChange("titleWeight", value[0])}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="desc-weight">
                            Description Weight: {duplicateConfig.descriptionWeight * 100}%
                          </Label>
                          <Slider
                            id="desc-weight"
                            min={0}
                            max={1}
                            step={0.1}
                            value={[duplicateConfig.descriptionWeight]}
                            onValueChange={(value) => handleConfigChange("descriptionWeight", value[0])}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Additional Detection Criteria</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <Label htmlFor="time-threshold">
                            Time Threshold: {duplicateConfig.timeThreshold / (60 * 60 * 1000)} hours
                          </Label>
                        </div>
                        <Slider
                          id="time-threshold"
                          min={1}
                          max={72}
                          step={1}
                          value={[duplicateConfig.timeThreshold / (60 * 60 * 1000)]}
                          onValueChange={(value) => handleConfigChange("timeThreshold", value[0] * 60 * 60 * 1000)}
                        />
                        <p className="text-xs text-gray-500">
                          Time window to consider for duplicate detection from same submitter
                        </p>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Switch
                          id="check-ip"
                          checked={duplicateConfig.checkIpAddress}
                          onCheckedChange={(checked) => handleConfigChange("checkIpAddress", checked)}
                        />
                        <Label htmlFor="check-ip">Consider IP address for duplicate detection</Label>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="ip-weight">IP Match Weight: {duplicateConfig.ipMatchWeight * 100}%</Label>
                        <Slider
                          id="ip-weight"
                          min={0}
                          max={1}
                          step={0.1}
                          value={[duplicateConfig.ipMatchWeight]}
                          onValueChange={(value) => handleConfigChange("ipMatchWeight", value[0])}
                          disabled={!duplicateConfig.checkIpAddress}
                        />
                      </div>

                      <div className="flex items-center space-x-2">
                        <Switch
                          id="adaptive-thresholds"
                          checked={duplicateConfig.enableAdaptiveThresholds}
                          onCheckedChange={(checked) => handleConfigChange("enableAdaptiveThresholds", checked)}
                        />
                        <Label htmlFor="adaptive-thresholds">Enable adaptive thresholds</Label>
                      </div>
                      <p className="text-xs text-gray-500">
                        Automatically adjust thresholds based on system performance
                      </p>
                    </CardContent>
                  </Card>
                </div>

                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={handleResetConfig}>
                    Reset to Defaults
                  </Button>
                  <Button>Save Configuration</Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="performance">
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">Detection Accuracy</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-center text-green-600">
                        {metrics?.detectionAccuracy || 92}%
                      </div>
                      <p className="text-sm text-gray-500 text-center">Overall accuracy</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">False Positives</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-center text-amber-600">
                        {metrics?.falsePositives || 2}
                      </div>
                      <p className="text-sm text-gray-500 text-center">Incorrectly flagged as duplicates</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">False Negatives</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-center text-red-600">{metrics?.falseNegatives || 1}</div>
                      <p className="text-sm text-gray-500 text-center">Missed duplicates</p>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>Performance Over Time</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={performanceData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Line type="monotone" dataKey="accuracy" stroke="#10b981" name="Accuracy %" />
                          <Line type="monotone" dataKey="falsePositives" stroke="#f59e0b" name="False Positives" />
                          <Line type="monotone" dataKey="falseNegatives" stroke="#ef4444" name="False Negatives" />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Algorithm Comparison</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={algorithmComparisonData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="accuracy" fill="#10b981" name="Accuracy %" />
                          <Bar dataKey="speed" fill="#3b82f6" name="Processing Speed" />
                          <Bar dataKey="falsePositives" fill="#f59e0b" name="False Positives %" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="logs">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium">System Logs</h3>
                  <div className="flex gap-2">
                    <Select defaultValue="all">
                      <SelectTrigger className="w-[150px]">
                        <SelectValue placeholder="Log type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All logs</SelectItem>
                        <SelectItem value="duplicates">Duplicates only</SelectItem>
                        <SelectItem value="non-duplicates">Non-duplicates</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="outline" size="sm">
                      Export Logs
                    </Button>
                  </div>
                </div>

                <Card className="h-full border border-border bg-card/95 dark:bg-card/80 shadow-md">
                  <CardHeader>
                    <CardTitle className="text-lg text-primary">System Logs</CardTitle>
                    <CardDescription className="text-muted-foreground">Review system activity and duplicate detection logs.</CardDescription>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="overflow-y-auto max-h-[400px] pr-2">
                      <ul className="divide-y divide-border">
                        {feedbackList.map((log) => (
                          <li
                            key={log.id}
                            className={`py-3 px-2 cursor-pointer rounded-lg transition-colors border border-transparent ${selectedLog === log.id ? "bg-accent/50 dark:bg-accent/20 border-ring border" : "hover:bg-muted/70 dark:hover:bg-muted/40"}`}
                            onClick={() => setSelectedLog(log.id)}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-foreground">Feedback #{log.id}</span>
                              <span className="text-xs text-accent-foreground">{log.status}</span>
                            </div>
                            <div className="text-xs text-muted-foreground truncate max-w-xs">
                              {log.title}
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="pl-2">
                      <Card className="h-full bg-popover/95 dark:bg-popover/60 border border-border shadow-sm">
                        <CardHeader>
                          <CardTitle className="text-base text-primary">Log Details</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          {selectedLog ? (
                            <div className="space-y-2">
                              <div>
                                <h4 className="text-sm font-medium text-muted-foreground">Title</h4>
                                <p className="font-medium text-foreground">
                                  {feedbackList.find((f) => f.id === selectedLog)?.title}
                                </p>
                              </div>
                              <div>
                                <h4 className="text-sm font-medium text-muted-foreground">Description</h4>
                                <p className="text-muted-foreground">
                                  {feedbackList.find((f) => f.id === selectedLog)?.description}
                                </p>
                              </div>
                              <div>
                                <h4 className="text-sm font-medium text-muted-foreground">Status</h4>
                                <p className="text-accent-foreground">
                                  {feedbackList.find((f) => f.id === selectedLog)?.status}
                                </p>
                              </div>
                              <div>
                                <h4 className="text-sm font-medium text-muted-foreground">Decision</h4>
                                <p className="mt-1">
                                  {feedbackList.find((f) => f.id === selectedLog)?.status === "duplicate" ||
                                  feedbackList.find((f) => f.id === selectedLog)?.status === "merged"
                                    ? "Marked as duplicate due to high content similarity and matching submission patterns."
                                    : "Not identified as a duplicate based on current similarity thresholds."}
                                </p>
                              </div>

                              {feedbackList.find((f) => f.id === selectedLog)?.duplicateOf && (
                                <div>
                                  <h4 className="text-sm font-medium text-muted-foreground">Duplicate Of</h4>
                                  <p className="mt-1">
                                    Feedback #{feedbackList.find((f) => f.id === selectedLog)?.duplicateOf}
                                  </p>
                                </div>
                              )}
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground">Select a log entry to view detailed information</p>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="users">
              <UserManagement />
            </TabsContent>
          </Tabs>
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
                    : "Manage duplicate feedback entries and review potential matches"}
          </p>
        </CardFooter>
      </Card>
    </motion.div>
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
