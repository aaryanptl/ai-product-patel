"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"

export default function Transcript() {
  const [transcript, setTranscript] = useState<string[]>([])

  useEffect(() => {
    const interval = setInterval(() => {
      setTranscript((prev) => [...prev, `New statement at ${new Date().toLocaleTimeString()}`])
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Live Transcript</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px]">
          {transcript.map((line, index) => (
            <p key={index} className="mb-2">
              {line}
            </p>
          ))}
        </ScrollArea>
      </CardContent>
    </Card>
  )
}

