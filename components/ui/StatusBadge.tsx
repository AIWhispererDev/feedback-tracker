"use client"

import React from "react"
import { FeedbackStatus } from "@/app/actions/feedback"

interface StatusBadgeProps {
  status: FeedbackStatus
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const label = status
    .split("_")
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");

  let bgColor = "bg-gray-200 text-gray-700";
  switch (status) {
    case "active":
    case "submitted":
      bgColor = "bg-blue-100 text-blue-800";
      break;
    case "under_review":
      bgColor = "bg-yellow-100 text-yellow-800";
      break;
    case "planned":
      bgColor = "bg-purple-100 text-purple-800";
      break;
    case "in_progress":
      bgColor = "bg-indigo-100 text-indigo-800";
      break;
    case "implemented":
      bgColor = "bg-green-100 text-green-800";
      break;
    case "declined":
      bgColor = "bg-red-100 text-red-800";
      break;
    default:
      break;
  }

  return (
    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${bgColor}`}>
      {label}
    </span>
  );
}
