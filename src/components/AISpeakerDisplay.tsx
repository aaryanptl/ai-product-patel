"use client";

import { useState, useEffect } from "react";
import { Loader2, Square, Mic } from "lucide-react";
import AudioPulseIndicator from "./AudioPulseIndicator";
import { motion } from "framer-motion";

// Add keyframe styles
const eyeBlinkKeyframes = `
  @keyframes eyeBlink {
    0%, 90%, 100% { transform: scaleY(1); }
    95% { transform: scaleY(0.1); }
  }
`;

interface AISpeakerDisplayProps {
  isAudioPlaying: boolean;
  isListening: boolean;
  isDebateLoading: boolean;
  isProcessing: boolean;
  audioLevel: number;
  sessionStatus: string;
  brainActivity: number[];
  handleMicButtonClick: () => void;
  currentDebateId: string | null;
}

export default function AISpeakerDisplay({
  isAudioPlaying,
  isListening,
  isDebateLoading,
  isProcessing,
  audioLevel,
  sessionStatus,
  brainActivity,
  handleMicButtonClick,
  currentDebateId,
}: AISpeakerDisplayProps) {
  // Add debug logging for isAudioPlaying changes
  useEffect(() => {
    console.log(`🎵 [AISpeakerDisplay] isAudioPlaying: ${isAudioPlaying}`);
  }, [isAudioPlaying]);

  // Add state for animation frames to enable continuous animation
  const [animationFrame, setAnimationFrame] = useState(0);

  // Setup animation loop for mouth bars when audio is playing
  useEffect(() => {
    let animationId: number;

    if (isAudioPlaying) {
      console.log("🎬 [AISpeakerDisplay] Starting mouth animation");
      const updateAnimation = () => {
        setAnimationFrame((prev) => prev + 1);
        animationId = requestAnimationFrame(updateAnimation);
      };

      animationId = requestAnimationFrame(updateAnimation);
    } else {
      // Force reset animation frame when audio stops
      setAnimationFrame(0);
      console.log("⏹️ [AISpeakerDisplay] Stopping mouth animation");
    }

    return () => {
      if (animationId) {
        console.log("🧹 [AISpeakerDisplay] Cleaning up animation frame");
        cancelAnimationFrame(animationId);
      }
    };
  }, [isAudioPlaying]);

  // Function to generate mouth bar heights based on the current animation frame
  const getMouthBarHeight = (index: number, isMiddle: boolean) => {
    // Base height differs by position
    const baseHeight = isMiddle ? 12 : 8;

    // Get current audio level (ensure it's at least 0.2 for some movement)
    const audioMultiplier = Math.max(audioLevel, 0.2);

    // Create position-based variation (bars in middle are taller)
    const positionFactor = isMiddle ? 1.5 : 1;

    // Calculate height using a more reactive formula
    // Use sin waves at different frequencies for natural audio visualization
    const wave1 = Math.sin(animationFrame * 0.1 + index * 0.5) * 10;
    const wave2 = Math.cos(animationFrame * 0.05 + index * 0.3) * 5;

    // Combine waves and apply audio level as a multiplier
    const dynamicHeight = (wave1 + wave2) * audioMultiplier * positionFactor;

    // Ensure minimum height and apply maximum based on position
    const minHeight = 3;
    const maxHeight = isMiddle ? 40 : 25;

    return Math.max(minHeight, Math.min(baseHeight + dynamicHeight, maxHeight));
  };

  return (
    <div className="flex-1 border p-4 rounded-2xl bg-slate-800/20 backdrop-blur-lg overflow-hidden flex flex-col">
      {/* Add style tag for keyframes */}
      <style dangerouslySetInnerHTML={{ __html: eyeBlinkKeyframes }} />

      <div className="flex-1 flex items-center justify-center p-8">
        <div className="relative">
          {/* Outer rings */}
          <div className="absolute inset-0 rounded-full border-2 border-emerald-500/30 animate-[spin_10s_linear_infinite]" />
          <div className="absolute inset-[-15px] rounded-full border border-emerald-400/20 animate-[spin_15s_linear_infinite_reverse]" />
          <div className="absolute inset-[-30px] rounded-full border border-emerald-300/10 animate-[spin_20s_linear_infinite]" />

          {/* Main AI face */}
          <div className="relative w-64 h-64 rounded-full border border-emerald-500/50 flex items-center justify-center overflow-hidden">
            <div className="absolute inset-2 rounded-full bg-slate-900/90" />

            {/* Brain activity ripple - visible during processing */}
            {isProcessing && (
              <div className="absolute inset-4 flex items-center justify-center">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="absolute rounded-full border border-amber-400/40 animate-ping"
                    style={{
                      width: `${50 + i * 20}%`,
                      height: `${50 + i * 20}%`,
                      animationDelay: `${i * 0.3}s`,
                      animationDuration: `${2 + i * 0.5}s`,
                    }}
                  />
                ))}
              </div>
            )}

            {/* Facial features container - ensures proper centering */}
            <div className="relative z-10 flex flex-col items-center justify-center h-full w-full">
              {/* AI eyebrows - adds expressiveness */}
              <div className="flex w-full justify-center space-x-20 mb-2">
                <div
                  className="w-8 h-1.5 bg-slate-400 rounded-full transition-all duration-300"
                  style={{
                    transform: isProcessing
                      ? "translateY(-4px) rotate(-10deg)"
                      : isListening
                      ? "translateY(-4px)"
                      : "translateY(-2px)",
                    opacity: isAudioPlaying ? "0.9" : "0.7",
                  }}
                />
                <div
                  className="w-8 h-1.5 bg-slate-400 rounded-full transition-all duration-300"
                  style={{
                    transform: isProcessing
                      ? "translateY(-4px) rotate(10deg)"
                      : isListening
                      ? "translateY(-4px)"
                      : "translateY(-2px)",
                    opacity: isAudioPlaying ? "0.9" : "0.7",
                  }}
                />
              </div>

              {/* AI eyes - more expressive based on state */}
              <div className="flex w-full justify-center space-x-20 mb-16">
                <div
                  className="size-8 bg-slate-200 rounded-sm transition-all duration-300"
                  style={{
                    transform: isProcessing
                      ? "rotate(45deg)"
                      : isAudioPlaying
                      ? `translateY(${Math.sin(Date.now() * 0.005) * 2}px)`
                      : "",
                    animation: isAudioPlaying
                      ? "none"
                      : isListening
                      ? "eyeBlink 3s infinite"
                      : "eyeBlink 5s infinite",
                  }}
                />
                <div
                  className="size-8 bg-slate-200 rounded-sm transition-all duration-300"
                  style={{
                    transform: isProcessing
                      ? "rotate(45deg)"
                      : isAudioPlaying
                      ? `translateY(${Math.sin(Date.now() * 0.005) * 2}px)`
                      : "",
                    animation: isAudioPlaying
                      ? "none"
                      : isListening
                      ? "eyeBlink 3s infinite"
                      : "eyeBlink 5s infinite",
                  }}
                />
              </div>

              {/* AI mouth - dynamic based on state */}
              <div className="flex flex-col items-center justify-center w-full">
                {isAudioPlaying ? (
                  <div className="flex justify-center gap-1 items-end">
                    {Array.from({ length: 12 }).map((_, i) => {
                      const hue = 160 + i * 3;
                      const baseHeight = Math.max(
                        4,
                        Math.min(12, audioLevel * 20)
                      );
                      const randomScale = 4 + Math.random() * audioLevel * 8; // Significantly increased scale range

                      return (
                        <motion.div
                          key={i}
                          className="rounded-full"
                          style={{
                            width: "4px",
                            height: `${baseHeight}px`,
                            backgroundColor: `hsl(${hue}, 94%, 65%)`,
                          }}
                          animate={{
                            scaleY: [1, randomScale], // Starts at 1 and scales up much higher
                            opacity: [0.5, 1],
                          }}
                          transition={{
                            duration: 0.4 + Math.random() * 0.4,
                            ease: "easeOut",
                            repeat: Infinity,
                            repeatType: "reverse",
                            delay: Math.random() * 0.5,
                          }}
                        />
                      );
                    })}
                  </div>
                ) : isListening ? (
                  <div className="w-28 h-1.5 bg-slate-400 rounded-full animate-pulse" />
                ) : isProcessing ? (
                  <div className="w-10 h-10">
                    <div className="w-full h-full border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : (
                  <div className="w-28 h-1.5 bg-slate-400 rounded-full transition-all duration-300" />
                )}
              </div>
            </div>

            {/* Emotion glow - changes color based on state */}
            <div
              className={`absolute inset-0 rounded-full opacity-15 transition-all duration-500 blur-xl ${
                isListening
                  ? "bg-emerald-500"
                  : isProcessing
                  ? "bg-amber-400"
                  : isAudioPlaying
                  ? "bg-blue-400"
                  : "bg-slate-800"
              }`}
            />

            {/* Data streams */}
            <div className="absolute inset-0 pointer-events-none">
              {Array.from({ length: 20 }).map((_, i) => (
                <div
                  key={i}
                  className="absolute w-px bg-gradient-to-b from-transparent via-emerald-400/30 to-transparent"
                  style={{
                    left: `${Math.random() * 100}%`,
                    height: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                    opacity: Math.random() * 0.5,
                    animationDuration: `${Math.random() * 3 + 2}s`,
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Microphone control */}
      <div className="p-8 flex justify-center">
        <div className="relative">
          <button
            onClick={handleMicButtonClick}
            disabled={isDebateLoading || !currentDebateId || isProcessing}
            className={`relative z-10 w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 ${
              isListening
                ? "bg-red-500 text-white"
                : "bg-gradient-to-br from-emerald-400 to-teal-600 text-black"
            } ${
              isDebateLoading || !currentDebateId || isProcessing
                ? "opacity-50 cursor-not-allowed"
                : "opacity-100"
            }`}
          >
            {isDebateLoading || isProcessing ? (
              <Loader2 className="w-8 h-8 animate-spin" />
            ) : isListening ? (
              <Square className="w-8 h-8" />
            ) : (
              <Mic className="w-8 h-8" />
            )}
          </button>

          {/* Audio pulse indicator */}
          <AudioPulseIndicator
            isListening={isListening}
            audioLevel={audioLevel}
          />
        </div>
      </div>

      <div className="px-8 pb-6 text-center text-emerald-400/80 font-light tracking-wider">
        {isDebateLoading ? (
          "INITIALIZING SESSION..."
        ) : isProcessing ? (
          sessionStatus
        ) : isListening ? (
          "LISTENING..."
        ) : sessionStatus && sessionStatus.startsWith("Error") ? (
          <div className="space-y-2">
            <div className="text-red-400">{sessionStatus}</div>
            <button
              onClick={handleMicButtonClick}
              className="mt-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-sm"
            >
              Retry Connection
            </button>
          </div>
        ) : (
          "TAP TO SPEAK"
        )}
      </div>
    </div>
  );
}
