"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"

export default function Timer() {
  const [time, setTime] = useState(300) // 5 minutes in seconds

  useEffect(() => {
    const interval = setInterval(() => {
      setTime((prev) => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const minutes = Math.floor(time / 60)
  const seconds = time % 60

  return (
    <Card>
      <CardContent className="flex items-center justify-center p-6">
        <div className="text-4xl font-bold">
          {minutes.toString().padStart(2, "0")}:{seconds.toString().padStart(2, "0")}
        </div>
      </CardContent>
    </Card>
  )
}

