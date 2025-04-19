"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { submitFeedback } from "../actions/feedback"
import type { Feedback, FeedbackCategory } from "../actions/feedback"

export function FeedbackForm() {
  const [error, setError] = useState("")
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState<FeedbackCategory>("general")
  const [duplicateWarning, setDuplicateWarning] = useState<{
    warning: string
    similarFeedback: Array<Feedback & { similarityScore: number; similarityDetails: any }>
    logIds: string
  } | null>(null)
  const router = useRouter()

  async function handleSubmit(formData: FormData) {
    // Reset previous errors/warnings
    setError("")
    setDuplicateWarning(null)

    // Get the user's IP address for duplicate detection
    // In a real app, this would be done server-side
    const ipAddress = "127.0.0.1" // Placeholder
    const userAgent = navigator.userAgent

    const result = await submitFeedback(formData, ipAddress, userAgent)

    if (result.error) {
      setError(result.error)
    } else if (result.warning && result.similarFeedback && result.similarFeedback.length > 0) {
      // Only show warning if there are actual similar feedback items above threshold
      setDuplicateWarning({
        warning: result.warning,
        similarFeedback: result.similarFeedback,
        logIds: result.logIds,
      })
    } else {
      // If no significant matches, just submit
      setError("")
      setDuplicateWarning(null)
      setTitle("")
      setDescription("")
      router.refresh()
      window.dispatchEvent(new Event("feedbackAdded"))
    }
  }

  function handleForceSubmit() {
    const formData = new FormData()
    formData.append("title", title)
    formData.append("description", description)
    formData.append("category", category)
    formData.append("forceDuplicate", "true")
    formData.append("logIds", duplicateWarning?.logIds || "")

    handleSubmit(formData)
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      <form action={handleSubmit} className="space-y-4">
        <h2 className="text-2xl font-bold">Suggest a modification</h2>
        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <Input name="title" placeholder="Title" required value={title} onChange={(e) => setTitle(e.target.value)} />
        </motion.div>
        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <Textarea
            name="description"
            placeholder="Description"
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </motion.div>
        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <Select name="category" value={category} onValueChange={(value: FeedbackCategory) => setCategory(value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="general">General</SelectItem>
              <SelectItem value="bug">Bug</SelectItem>
              <SelectItem value="feature">Feature Request</SelectItem>
              <SelectItem value="improvement">Improvement</SelectItem>
            </SelectContent>
          </Select>
        </motion.div>
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Button type="submit">Submit Feedback</Button>
        </motion.div>
        {error && (
          <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </form>

      {/* Duplicate Warning Dialog */}
      <Dialog open={!!duplicateWarning} onOpenChange={() => setDuplicateWarning(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Potential Duplicate Detected</DialogTitle>
            <DialogDescription>
              Your feedback appears similar to existing entries. What would you like to do?
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[400px] overflow-y-auto space-y-3 my-4">
            <p className="font-semibold">Similar feedback:</p>
            {duplicateWarning?.similarFeedback.map((feedback) => (
              <div key={feedback.id} className="border p-3 rounded-md">
                <div className="flex justify-between items-start">
                  <h4 className="font-medium">{feedback.title}</h4>
                  <span className="text-sm bg-amber-100 text-amber-800 px-2 py-1 rounded-full">
                    {feedback.similarityScore}% similar
                  </span>
                </div>
                <p className="text-sm text-gray-600">{feedback.description}</p>

                {feedback.similarityDetails && (
                  <div className="mt-2 text-xs text-gray-500 space-y-1">
                    <div className="flex justify-between">
                      <span>Title similarity:</span>
                      <span className="font-medium">{feedback.similarityDetails.titleSimilarity}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Description similarity:</span>
                      <span className="font-medium">{feedback.similarityDetails.descriptionSimilarity}%</span>
                    </div>
                  </div>
                )}

                <div className="flex text-xs text-gray-500 mt-2 gap-2">
                  <span>👍 {feedback.upvotes}</span>
                  <span>👎 {feedback.downvotes}</span>
                  <span>Date: {feedback.date}</span>
                </div>
              </div>
            ))}
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setDuplicateWarning(null)}>
              Cancel
            </Button>
            <Button variant="default" onClick={handleForceSubmit}>
              Submit Anyway
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}
