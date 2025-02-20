"use client"

import { motion } from "framer-motion"

interface SphereVisualizerProps {
  isActive: boolean
}

export default function SphereVisualizer({ isActive }: SphereVisualizerProps) {
  const dots = Array.from({ length: 80 })

  return (
    <div className="relative w-full h-full">
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.div
          className="relative w-64 h-64"
          animate={{
            rotate: isActive ? 360 : 0,
          }}
          transition={{
            duration: 20,
            repeat: Number.POSITIVE_INFINITY,
            ease: "linear",
          }}
        >
          {dots.map((_, i) => {
            const angle = (i / dots.length) * Math.PI * 2
            const radius = 120
            const x = Math.cos(angle) * radius
            const y = Math.sin(angle) * radius

            return (
              <motion.div
                key={i}
                className="absolute w-1.5 h-1.5 rounded-full bg-green-400/30"
                style={{
                  left: "50%",
                  top: "50%",
                  x,
                  y,
                }}
                animate={{
                  opacity: isActive ? [0.3, 0.6, 0.3] : 0.3,
                  scale: isActive ? [1, 1.2, 1] : 1,
                }}
                transition={{
                  duration: 2,
                  repeat: Number.POSITIVE_INFINITY,
                  delay: i * (2 / dots.length),
                  ease: "easeInOut",
                }}
              />
            )
          })}
        </motion.div>
      </div>
    </div>
  )
}

