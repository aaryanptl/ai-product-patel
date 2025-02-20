"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"

export default function DebateStage() {
  const [currentSpeaker, setCurrentSpeaker] = useState("AI")

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSpeaker((prev) => (prev === "AI" ? "Human PM" : "AI"))
    }, 10000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="relative h-96 bg-gray-800 rounded-lg overflow-hidden">
      <motion.div
        className="absolute inset-0 flex items-center justify-center"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        {currentSpeaker === "AI" ? (
          <div className="text-center">
            <div className="w-32 h-32 bg-blue-500 rounded-full mx-auto mb-4 animate-pulse" />
            <h2 className="text-2xl font-bold">AI Speaker</h2>
          </div>
        ) : (
          <div className="text-center">
            <div className="w-32 h-32 bg-green-500 rounded-full mx-auto mb-4" />
            <h2 className="text-2xl font-bold">Human PM</h2>
          </div>
        )}
      </motion.div>
    </div>
  )
}

