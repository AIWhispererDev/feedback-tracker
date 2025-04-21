"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { motion } from "framer-motion"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FeedbackForm } from "./components/FeedbackForm"
import { FeedbackList } from "./components/FeedbackList"
import { AdminPanel } from "./components/AdminPanel"
import DiscordFeedback from "./components/DiscordFeedback"

export default function Home() {
  const { data: session } = useSession()
  const [activeTab, setActiveTab] = useState("feedback")

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="container mx-auto p-4"
    >
      <motion.h1
        initial={{ y: -20 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="text-3xl font-bold mb-8"
      >
        User Feedback
      </motion.h1>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
        <TabsList>
          <TabsTrigger value="feedback">Feedback</TabsTrigger>
          <TabsTrigger value="discord">Discord Logs</TabsTrigger>
          {session?.user?.role === "admin" && (
            <TabsTrigger value="admin">Admin Panel</TabsTrigger>
          )}
        </TabsList>
        <TabsContent value="feedback">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <FeedbackForm />
            <FeedbackList />
          </div>
        </TabsContent>
        <TabsContent value="discord">
          <DiscordFeedback />
        </TabsContent>
        {session?.user?.role === "admin" && (
          <TabsContent value="admin">
            <AdminPanel />
          </TabsContent>
        )}
      </Tabs>
    </motion.div>
  )
}
