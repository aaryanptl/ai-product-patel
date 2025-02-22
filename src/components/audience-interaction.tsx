"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"

export default function AudienceInteraction() {
  const [votes, setVotes] = useState({ human: 0, ai: 0 })

  const handleVote = (type: "human" | "ai") => {
    setVotes((prev) => ({ ...prev, [type]: prev[type] + 1 }))
  }

  const totalVotes = votes.human + votes.ai
  const humanPercentage = totalVotes ? (votes.human / totalVotes) * 100 : 0
  const aiPercentage = totalVotes ? (votes.ai / totalVotes) * 100 : 0

  return (
    <Card>
      <CardHeader>
        <CardTitle>Audience Poll</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-4">Who do you think is winning the debate?</p>
        <div className="space-y-4">
          <Button onClick={() => handleVote("human")} className="w-full">
            Vote for Human PMs
          </Button>
          <Button onClick={() => handleVote("ai")} className="w-full">
            Vote for AI
          </Button>
        </div>
        <div className="mt-8 space-y-4">
          <div>
            <p>Human PMs: {humanPercentage.toFixed(1)}%</p>
            <Progress value={humanPercentage} className="h-2" />
          </div>
          <div>
            <p>AI: {aiPercentage.toFixed(1)}%</p>
            <Progress value={aiPercentage} className="h-2" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

