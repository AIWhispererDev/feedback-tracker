"use client"

import { useState, useEffect } from "react"
import { Bell, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu"
import { useSession } from "next-auth/react"
import { supabaseBrowserClient } from "@/app/lib/supabaseBrowserClient"
import type { RealtimePostgresInsertPayload } from '@supabase/supabase-js'

interface Notification {
  id: string
  is_read: boolean
  created_at: string
  feedback_status_history: {
    feedback_id: number
    old_status: string
    new_status: string
    changed_by: string
    reason: string
    changed_at: string
  }[]
}

export function NotificationCenter() {
  const session = useSession()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [open, setOpen] = useState(false)

  // helper: load notifications from API
  const fetchNotifications = async () => {
    if (!session.data?.user?.id) return
    try {
      const res = await fetch('/api/notifications')
      if (!res.ok) throw new Error('Failed to fetch notifications')
      const data: Notification[] = await res.json()
      setNotifications(data)
    } catch (err) {
      console.error('Error fetching notifications:', err)
    }
  }

  useEffect(() => {
    fetchNotifications()
  }, [session.data?.user?.id])

  useEffect(() => {
    if (!session.data?.user?.id) return
    const channel = supabaseBrowserClient
      .channel('public:notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${session.data.user.id}` },
        fetchNotifications
      )
      .subscribe()
    return () => {
      supabaseBrowserClient.removeChannel(channel)
    }
  }, [session.data?.user?.id])

  const handleClearAll = async () => {
    await fetch('/api/notifications', { method: 'DELETE' })
    setNotifications([])
  }

  const handleDelete = async (id: string) => {
    await fetch(`/api/notifications?id=${id}`, { method: 'DELETE' })
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5 text-muted-foreground" />
          {notifications.length > 0 && (
            <span className="absolute -top-1 -right-1 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold text-white bg-blue-500 rounded-full">
              {notifications.length}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between px-3 py-1">
          <DropdownMenuLabel className="font-semibold">Notifications</DropdownMenuLabel>
          {notifications.length > 0 && (
            <Button variant="ghost" size="sm" onClick={handleClearAll} className="text-muted-foreground">
              Clear all
            </Button>
          )}
        </div>
        <div className="max-h-[300px] overflow-y-auto py-1">
          {notifications.length > 0 ? (
            notifications.map((n) => {
              const hist = n.feedback_status_history?.[0]
              if (!hist) {
                return (
                  <div key={n.id} className="relative px-2 py-1 text-red-500">
                    Notification missing history data
                  </div>
                )
              }
              return (
                <div key={n.id} className="relative px-2 py-1">
                  <Button variant="ghost" size="icon" className="absolute top-1 right-1" onClick={() => handleDelete(n.id)}>
                    <X className="h-4 w-4 text-muted-foreground" />
                  </Button>
                  <div className="border p-3 rounded-md bg-background hover:bg-accent/10 transition-colors cursor-pointer">
                    <p className="text-sm text-foreground">
                      Feedback <span className="font-medium">#{hist.feedback_id}</span> status changed to <strong>{hist.new_status}</strong>
                    </p>
                    {hist.reason && <p className="text-xs text-muted-foreground mt-1">Reason: {hist.reason}</p>}
                    <p className="text-xs text-muted-foreground mt-1">{new Date(hist.changed_at).toLocaleString()}</p>
                  </div>
                </div>
              )
            })
          ) : (
            <div className="px-2 py-2 text-center text-muted-foreground text-sm">No notifications</div>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
