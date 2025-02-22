"use client";

import { motion } from "framer-motion";

interface SphereVisualizerProps {
  isActive: boolean;
  audioData?: Uint8Array;
}

export default function SphereVisualizer({
  isActive,
  audioData,
}: SphereVisualizerProps) {
  // Create two layers of dots for 3D effect
  const innerDots = Array.from({ length: 40 });
  const outerDots = Array.from({ length: 60 });

  // Calculate audio intensity (average of frequency data)
  const audioIntensity = audioData
    ? audioData.reduce((sum, value) => sum + value, 0) / audioData.length / 255
    : 0;

  return (
    <div className="relative w-full h-full">
      <div className="absolute inset-0 flex items-center justify-center">
        {/* Outer rotating sphere */}
        <motion.div
          className="relative w-72 h-72"
          animate={{
            rotate: isActive ? 360 : 0,
            scale:
              audioData && isActive ? [1, 1.2 + audioIntensity * 0.4, 1] : 1,
          }}
          transition={{
            rotate: {
              duration: 25,
              repeat: Number.POSITIVE_INFINITY,
              ease: "linear",
            },
            scale: {
              duration: audioData && isActive ? 0.05 : 0,
              repeat: audioData && isActive ? Number.POSITIVE_INFINITY : 0,
              ease: "easeInOut",
            },
          }}
        >
          {outerDots.map((_, i) => {
            const angle = (i / outerDots.length) * Math.PI * 2;
            const radius = 130;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;

            const frequencyIndex = Math.floor(
              (i / outerDots.length) * (audioData?.length || 0)
            );
            const frequency =
              audioData && isActive ? audioData[frequencyIndex] / 255 : 0;

            return (
              <motion.div
                key={`outer-${i}`}
                className="absolute w-2 h-2 rounded-full bg-gradient-to-r from-green-400/60 to-emerald-500/60"
                style={{
                  left: "50%",
                  top: "50%",
                  x,
                  y,
                }}
                animate={{
                  opacity:
                    audioData && isActive
                      ? [0.4, 0.9 + frequency * 0.8, 0.4]
                      : 0.4,
                  scale:
                    audioData && isActive ? [1, 1.5 + frequency * 1.2, 1] : 1,
                  background: isActive
                    ? [
                        `rgba(74, 222, 128, ${0.6 + (frequency || 0.2) * 0.8})`,
                        `rgba(52, 211, 153, ${0.6 + (frequency || 0.2) * 0.8})`,
                        `rgba(74, 222, 128, ${0.6 + (frequency || 0.2) * 0.8})`,
                      ]
                    : "rgba(74, 222, 128, 0.6)",
                }}
                transition={{
                  duration: audioData && isActive ? 0.05 : 0,
                  repeat: audioData && isActive ? Number.POSITIVE_INFINITY : 0,
                  delay:
                    audioData && isActive ? 0 : i * (1.5 / outerDots.length),
                  ease: "easeInOut",
                }}
                whileHover={{
                  scale: 2,
                  opacity: 0.9,
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
            scale:
              audioData && isActive ? [1, 1.15 + audioIntensity * 0.3, 1] : 1,
          }}
          transition={{
            rotate: {
              duration: 20,
              repeat: Number.POSITIVE_INFINITY,
              ease: "linear",
            },
            scale: {
              duration: audioData && isActive ? 0.05 : 0,
              repeat: audioData && isActive ? Number.POSITIVE_INFINITY : 0,
              ease: "easeInOut",
            },
          }}
        >
          {innerDots.map((_, i) => {
            const angle = (i / innerDots.length) * Math.PI * 2;
            const radius = 90;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;

            const frequencyIndex = Math.floor(
              (i / innerDots.length) * (audioData?.length || 0)
            );
            const frequency = audioData ? audioData[frequencyIndex] / 255 : 0;

            return (
              <motion.div
                key={`inner-${i}`}
                className="absolute w-1.5 h-1.5 rounded-full bg-gradient-to-r from-emerald-400/50 to-green-500/50"
                style={{
                  left: "50%",
                  top: "50%",
                  x,
                  y,
                }}
                animate={{
                  opacity:
                    audioData && isActive
                      ? [0.3, 0.8 + frequency * 0.6, 0.3]
                      : [0.3, 0.5, 0.3],
                  scale:
                    audioData && isActive
                      ? [1, 1.4 + frequency * 0.8, 1]
                      : [1, 1.1, 1],
                  background: isActive
                    ? [
                        `rgba(52, 211, 153, ${0.5 + (frequency || 0.2) * 0.7})`,
                        `rgba(74, 222, 128, ${0.5 + (frequency || 0.2) * 0.7})`,
                        `rgba(52, 211, 153, ${0.5 + (frequency || 0.2) * 0.7})`,
                      ]
                    : "rgba(52, 211, 153, 0.5)",
                }}
                transition={{
                  duration: audioData && isActive ? 0.05 : 1.5,
                  repeat: Number.POSITIVE_INFINITY,
                  delay:
                    audioData && isActive ? 0 : i * (1.5 / innerDots.length),
                  ease: "easeInOut",
                }}
                whileHover={{
                  scale: 1.8,
                  opacity: 0.8,
                }}
              />
            );
          })}
        </motion.div>
      </div>
    </div>
  );
}
