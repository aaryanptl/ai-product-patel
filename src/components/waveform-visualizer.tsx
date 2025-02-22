"use client"

import { motion } from "framer-motion"

interface WaveformVisualizerProps {
  isActive: boolean
}

export default function WaveformVisualizer({ isActive }: WaveformVisualizerProps) {
  const bars = 24

  return (
    <div className="flex items-center justify-center gap-1 h-8">
      {Array.from({ length: bars }).map((_, i) => (
        <motion.div
          key={i}
          className="w-2 bg-green-400"
          animate={{
            height: isActive ? ["20%", "100%", "20%"] : "20%",
          }}
          transition={{
            duration: 1,
            repeat: Number.POSITIVE_INFINITY,
            delay: i * (1 / bars),
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  )
}

