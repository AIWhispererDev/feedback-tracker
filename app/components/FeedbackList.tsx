"use client";

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { MoreHorizontal } from "lucide-react"
import { getFeedbackList, voteFeedback, mergeFeedback, changeFeedbackStatus } from "../actions/feedback"
import type { Feedback, FeedbackStatus } from "../actions/feedback"
import { StatusBadge } from "@/components/ui/StatusBadge"
import { Textarea } from "@/components/ui/textarea"

type SortOption = "recent" | "upvotes"
type ViewOption = "active" | "all"

export function FeedbackList() {
  const [feedbackList, setFeedbackList] = useState<Feedback[]>([])
  const [sortOption, setSortOption] = useState<SortOption>("recent")
  const [viewOption, setViewOption] = useState<ViewOption>("active")
  const [mergeDialog, setMergeDialog] = useState<{
    open: boolean
    sourceId: number | null
    targetOptions: Feedback[]
  }>({ open: false, sourceId: null, targetOptions: [] })
  const [statusDialog, setStatusDialog] = useState<{
    open: boolean
    feedbackId: number | null
    newStatus: FeedbackStatus | null
    reason: string
  }>({ open: false, feedbackId: null, newStatus: null, reason: "" })

  // Map current status to allowed next statuses
  const statusTransitions: Record<FeedbackStatus, { label: string; value: FeedbackStatus }[]> = {
    active: [
      { label: 'Under Review', value: 'under_review' },
      { label: 'Archived',    value: 'archived' }
    ],
    under_review: [
      { label: 'Planned',    value: 'planned' },
      { label: 'Declined',   value: 'declined' }
    ],
    planned: [
      { label: 'In Progress', value: 'in_progress' }
    ],
    in_progress: [
      { label: 'Implemented', value: 'implemented' }
    ],
    implemented: [],
    declined: [],
    duplicate: [],
    merged: [],
    archived: [
      { label: 'Active', value: 'active' },
      { label: 'Under Review', value: 'under_review' },
      { label: 'Planned', value: 'planned' },
      { label: 'In Progress', value: 'in_progress' },
      { label: 'Implemented', value: 'implemented' },
      { label: 'Declined', value: 'declined' },
      { label: 'Duplicate', value: 'duplicate' },
      { label: 'Merged', value: 'merged' }
    ],
  }

  useEffect(() => {
    const fetchList = () => {
      getFeedbackList(viewOption === "all").then((list) => {
        setFeedbackList(sortFeedbackList(list, sortOption))
      })
    }
    // initial fetch
    fetchList()
    // listen for new feedback submissions
    window.addEventListener("feedbackAdded", fetchList)
    return () => window.removeEventListener("feedbackAdded", fetchList)
  }, [sortOption, viewOption])

  async function handleVote(id: number, voteType: "upvote" | "downvote") {
    await voteFeedback(id, voteType)
    const updatedList = await getFeedbackList(viewOption === "all")
    setFeedbackList(sortFeedbackList(updatedList, sortOption))
  }

  function sortFeedbackList(list: Feedback[], option: SortOption): Feedback[] {
    return [...list].sort((a, b) => {
      if (option === "recent") {
        return new Date(b.date).getTime() - new Date(a.date).getTime()
      } else {
        return b.upvotes - a.upvotes
      }
    })
  }

  async function handleStatusChange(id: number, status: FeedbackStatus) {
    await changeFeedbackStatus(id, status)
    const updatedList = await getFeedbackList(viewOption === "all")
    setFeedbackList(sortFeedbackList(updatedList, sortOption))
  }

  function openMergeDialog(sourceId: number) {
    // Get potential merge targets (active feedback excluding the source)
    const targets = feedbackList.filter((f) => f.status === "active" && f.id !== sourceId)

    setMergeDialog({
      open: true,
      sourceId,
      targetOptions: targets,
    })
  }

  function openStatusDialog(id: number, status: FeedbackStatus) {
    setStatusDialog({ open: true, feedbackId: id, newStatus: status, reason: "" })
  }

  async function handleMerge(targetId: number) {
    if (mergeDialog.sourceId) {
      await mergeFeedback(mergeDialog.sourceId, targetId)
      setMergeDialog({ open: false, sourceId: null, targetOptions: [] })

      // Refresh the list
      const updatedList = await getFeedbackList(viewOption === "all")
      setFeedbackList(sortFeedbackList(updatedList, sortOption))
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-4"
    >
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Submitted Feedback</h2>
        <div className="flex gap-2">
          <Select value={viewOption} onValueChange={(value: ViewOption) => setViewOption(value)}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="View" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="all">All</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortOption} onValueChange={(value: SortOption) => setSortOption(value)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Most Recent</SelectItem>
              <SelectItem value="upvotes">Most Upvotes</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <AnimatePresence>
        {feedbackList.map((feedback) => (
          <motion.div
            key={feedback.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="border p-4 rounded-md bg-background"
          >
            <div className="flex justify-between">
              <div>
                <h3 className="font-semibold">{feedback.title}</h3>
                <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">{feedback.category}</span>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={feedback.status} />

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {feedback.status === 'active' && (
                      <DropdownMenuItem onClick={() => openMergeDialog(feedback.id)}>
                        Merge with another
                      </DropdownMenuItem>
                    )}
                    {statusTransitions[feedback.status]?.map(({ label, value }) => (
                      <DropdownMenuItem key={value} onClick={() => openStatusDialog(feedback.id, value)}>
                        {label}
                      </DropdownMenuItem>
                    ))}
                    {!statusTransitions[feedback.status] && feedback.status !== 'active' && (
                      <DropdownMenuItem onClick={() => openStatusDialog(feedback.id, 'active')}>
                        Mark as active
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            <p className="text-sm text-gray-600 mt-2">{feedback.description}</p>

            {feedback.duplicateOf && (
              <p className="text-xs text-amber-600 mt-1">Duplicate of feedback #{feedback.duplicateOf}</p>
            )}

            <p className="text-xs text-gray-400 mt-1">Submitted on: {feedback.date}</p>

            <div className="flex space-x-2 mt-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleVote(feedback.id, "upvote")}
                disabled={feedback.status !== "active"}
              >
                👍 {feedback.upvotes}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleVote(feedback.id, "downvote")}
                disabled={feedback.status !== "active"}
              >
                👎 {feedback.downvotes}
              </Button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Merge Dialog */}
      <Dialog open={mergeDialog.open} onOpenChange={(open) => setMergeDialog((prev) => ({ ...prev, open }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Merge Feedback</DialogTitle>
            <DialogDescription>
              Select the feedback item to merge with. Votes will be combined and the selected item will be marked as
              merged.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[300px] overflow-y-auto space-y-3 my-4">
            {mergeDialog.targetOptions.map((feedback) => (
              <div
                key={feedback.id}
                className="border p-3 rounded-md cursor-pointer bg-background"
                onClick={() => handleMerge(feedback.id)}
              >
                <h4 className="font-medium">{feedback.title}</h4>
                <p className="text-sm text-gray-600">{feedback.description}</p>
                <div className="flex text-xs text-gray-500 mt-1 gap-2">
                  <span>👍 {feedback.upvotes}</span>
                  <span>👎 {feedback.downvotes}</span>
                </div>
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setMergeDialog({ open: false, sourceId: null, targetOptions: [] })}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Status Change Dialog */}
      <Dialog open={statusDialog.open} onOpenChange={(open) => setStatusDialog((prev) => ({ ...prev, open }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Status</DialogTitle>
            <DialogDescription>
              Provide a reason for changing status to <strong>{statusDialog.newStatus}</strong>
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Reason (optional)"
            value={statusDialog.reason}
            onChange={(e) => setStatusDialog((prev) => ({ ...prev, reason: e.target.value }))}
            className="w-full mb-4"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusDialog({ open: false, feedbackId: null, newStatus: null, reason: "" })}>
              Cancel
            </Button>
            <Button
              variant="default"
              onClick={async () => {
                if (statusDialog.feedbackId && statusDialog.newStatus) {
                  await changeFeedbackStatus(statusDialog.feedbackId, statusDialog.newStatus, statusDialog.reason)
                  setStatusDialog({ open: false, feedbackId: null, newStatus: null, reason: "" })
                  const updatedList = await getFeedbackList(viewOption === "all")
                  setFeedbackList(sortFeedbackList(updatedList, sortOption))
                }
              }}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}
