"use client";

import { motion } from "framer-motion";

interface SphereVisualizerProps {
  isActive: boolean;
}

export default function SphereVisualizer({ isActive }: SphereVisualizerProps) {
  // Create two layers of dots for 3D effect
  const innerDots = Array.from({ length: 40 });
  const outerDots = Array.from({ length: 60 });

  return (
    <div className="relative w-full h-full">
      <div className="absolute inset-0 flex items-center justify-center">
        {/* Outer rotating sphere */}
        <motion.div
          className="relative w-72 h-72"
          animate={{
            rotate: isActive ? 360 : 0,
            scale: isActive ? [1, 1.05, 1] : 1,
          }}
          transition={{
            rotate: {
              duration: 25,
              repeat: Number.POSITIVE_INFINITY,
              ease: "linear",
            },
            scale: {
              duration: 3,
              repeat: Number.POSITIVE_INFINITY,
              ease: "easeInOut",
            },
          }}
        >
          {outerDots.map((_, i) => {
            const angle = (i / outerDots.length) * Math.PI * 2;
            const radius = 130;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;

            return (
              <motion.div
                key={`outer-${i}`}
                className="absolute w-2 h-2 rounded-full bg-gradient-to-r from-green-400/40 to-emerald-500/40"
                style={{
                  left: "50%",
                  top: "50%",
                  x,
                  y,
                }}
                animate={{
                  opacity: isActive ? [0.2, 0.5, 0.2] : 0.2,
                  scale: isActive ? [1, 1.3, 1] : 1,
                  background: isActive
                    ? [
                        "rgba(74, 222, 128, 0.4)",
                        "rgba(52, 211, 153, 0.4)",
                        "rgba(74, 222, 128, 0.4)",
                      ]
                    : "rgba(74, 222, 128, 0.4)",
                }}
                transition={{
                  duration: 3,
                  repeat: Number.POSITIVE_INFINITY,
                  delay: i * (3 / outerDots.length),
                  ease: "easeInOut",
                }}
                whileHover={{
                  scale: 1.5,
                  opacity: 0.8,
                }}
              />
            );
          })}
        </motion.div>

        {/* Inner rotating sphere (opposite direction) */}
        <motion.div
          className="absolute w-56 h-56"
          animate={{
            rotate: isActive ? -360 : 0,
          }}
          transition={{
            duration: 20,
            repeat: Number.POSITIVE_INFINITY,
            ease: "linear",
          }}
        >
          {innerDots.map((_, i) => {
            const angle = (i / innerDots.length) * Math.PI * 2;
            const radius = 90;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;

            return (
              <motion.div
                key={`inner-${i}`}
                className="absolute w-1.5 h-1.5 rounded-full bg-gradient-to-r from-emerald-400/30 to-green-500/30"
                style={{
                  left: "50%",
                  top: "50%",
                  x,
                  y,
                }}
                animate={{
                  opacity: isActive ? [0.15, 0.4, 0.15] : 0.15,
                  scale: isActive ? [1, 1.2, 1] : 1,
                }}
                transition={{
                  duration: 2,
                  repeat: Number.POSITIVE_INFINITY,
                  delay: i * (2 / innerDots.length),
                  ease: "easeInOut",
                }}
                whileHover={{
                  scale: 1.5,
                  opacity: 0.6,
                }}
              />
            );
          })}
        </motion.div>
      </div>
    </div>
  );
}
