"use client"

import React, { useEffect, useState } from "react"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { Label } from "@/components/ui/label"

export type Role = "admin" | "moderator" | "user"
export type User = { id: string; name: string; email: string; role: Role }

export function UserManagement() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/users")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch users")
        return res.json()
      })
      .then((data: User[]) => setUsers(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  const handleRoleChange = async (id: string, role: Role) => {
    const prev = [...users]
    setUsers((u) => u.map((user) => (user.id === id ? { ...user, role } : user)))
    const res = await fetch(`/api/users/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    })
    if (!res.ok) {
      setUsers(prev)
      setError("Failed to update role")
    }
  }

  if (loading) return <p>Loading users...</p>
  if (error) return <p className="text-red-500">{error}</p>

  return (
    <div className="space-y-4">
      {users.map((user) => (
        <div
          key={user.id}
          className="flex items-center justify-between border border-border bg-card p-4 rounded-lg shadow-sm transition-colors dark:bg-card/80 hover:bg-accent/50 dark:hover:bg-accent/20"
        >
          <div>
            <p className="font-semibold text-foreground">{user.name}</p>
            <p className="text-xs text-muted-foreground">{user.email}</p>
          </div>
          <Select
            value={user.role}
            onValueChange={(newRole) => handleRoleChange(user.id, newRole as Role)}
          >
            <SelectTrigger className="w-32 bg-secondary border border-border text-foreground focus:ring-ring focus:border-ring">
              <SelectValue placeholder="Role" />
            </SelectTrigger>
            <SelectContent className="bg-popover border border-border">
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="moderator">Moderator</SelectItem>
              <SelectItem value="user">User</SelectItem>
            </SelectContent>
          </Select>
        </div>
      ))}
    </div>
  )
}
