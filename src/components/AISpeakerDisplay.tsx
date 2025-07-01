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
  
  @keyframes eyeBlinkSpeaking {
    0%, 85%, 100% { transform: scaleY(1); }
    87% { transform: scaleY(0.1); }
  }

  @keyframes mouthSpeaking {
    0% { transform: scaleY(0.7); }
    50% { transform: scaleY(1.3); }
    100% { transform: scaleY(0.7); }
  }
`;

interface AISpeakerDisplayProps {
  isAudioPlaying: boolean;
  isListening: boolean;
  isProcessing: boolean;
  audioLevel: number;
  sessionStatus: string;
  handleMicButtonClick: () => void;
  isDarkMode?: boolean;
}

export default function AISpeakerDisplay({
  isAudioPlaying,
  isListening,
  isProcessing,
  audioLevel,
  sessionStatus,
  handleMicButtonClick,
  isDarkMode = false,
}: AISpeakerDisplayProps) {
  // Add debug logging for isAudioPlaying changes
  useEffect(() => {
    console.log(`🎵 [AISpeakerDisplay] isAudioPlaying: ${isAudioPlaying}`);
  }, [isAudioPlaying]);

  // Removed animation frame state and useEffect since we're using Framer Motion's built-in animations

  return (
    <div
      className={`w-full h-full rounded-2xl grid p-10 shadow-lg transition-all duration-300 ${
        isDarkMode
          ? "bg-gray-800 shadow-emerald-900/20"
          : "bg-white shadow-gray-200/60"
      }`}
    >
      {/* Add style tag for keyframes */}
      <style dangerouslySetInnerHTML={{ __html: eyeBlinkKeyframes }} />

      {/* AI Face */}
      <div className="flex justify-center">
        <div
          className={`relative w-64 h-64 rounded-full flex items-center justify-center ${
            isDarkMode
              ? "bg-gray-900 border-4 border-emerald-400/20"
              : "bg-gray-800 border-4 border-emerald-500/20"
          }`}
        >
          {/* Gradient overlay */}
          <div className="absolute inset-0 rounded-full overflow-hidden">
            <div
              className="absolute inset-0 rounded-full"
              style={{
                background: isDarkMode
                  ? "radial-gradient(circle at center, rgba(16, 185, 129, 0.2) 0%, transparent 70%)"
                  : "radial-gradient(circle at center, rgba(16, 185, 129, 0.3) 0%, transparent 70%)",
              }}
            ></div>
          </div>

          {/* Outer rings - Keeping original animation */}
          <div className="absolute inset-0 rounded-full border-2 border-emerald-500/30 animate-[spin_10s_linear_infinite]" />
          <div className="absolute inset-[-15px] rounded-full border border-emerald-400/20 animate-[spin_15s_linear_infinite_reverse]" />

          {/* Facial features container */}
          <div className="relative z-10 flex flex-col items-center justify-center h-full w-full">
            {/* Eyes */}
            <div className="flex gap-16 mb-6">
              <div
                className={`w-8 h-4 rounded-sm ${
                  isDarkMode ? "bg-gray-300" : "bg-gray-200"
                }`}
                style={{
                  animation: isAudioPlaying
                    ? "eyeBlinkSpeaking 3s infinite"
                    : isListening
                    ? "eyeBlink 3s infinite"
                    : "eyeBlink 3s infinite",
                }}
              ></div>
              <div
                className={`w-8 h-4 rounded-sm ${
                  isDarkMode ? "bg-gray-300" : "bg-gray-200"
                }`}
                style={{
                  animation: isAudioPlaying
                    ? "eyeBlinkSpeaking 3s infinite"
                    : isListening
                    ? "eyeBlink 3s infinite"
                    : "eyeBlink 3s infinite",
                }}
              ></div>
            </div>

            {/* Mouth - Dynamic based on state */}
            <div className="absolute top-1/2 mt-12 flex justify-center items-center w-full">
              {isAudioPlaying ? (
                <div className="flex justify-center gap-1 items-end">
                  {Array.from({ length: 12 }).map((_, i) => {
                    const hue = 160 + i * 3;
                    // Calculate a fixed height based on position - middle bars taller
                    const isMiddle = i > 3 && i < 8;
                    const baseHeight = isMiddle ? 12 : 8;

                    // Base animation speed varies slightly per bar
                    const duration = 0.4 + (i % 3) * 0.15;

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
                          scaleY: [0.7, 1.5, 0.7],
                          opacity: [0.5, 1, 0.5],
                        }}
                        transition={{
                          duration: duration,
                          ease: "easeInOut",
                          repeat: Infinity,
                          delay: i * 0.05, // Staggered delay based on bar position
                        }}
                      />
                    );
                  })}
                </div>
              ) : isListening ? (
                <div className="w-24 h-1 rounded-full bg-gray-300 animate-pulse" />
              ) : isProcessing ? (
                <div className="w-14 h-14">
                  <div className="w-full h-full border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <div className="w-24 h-1 rounded-full bg-gray-300" />
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
        </div>
      </div>

      {/* Microphone Button */}
      <div className="flex flex-col items-center gap-4 mt-auto">
        <button
          onClick={handleMicButtonClick}
          disabled={isProcessing}
          className={`rounded-full w-16 h-16 flex items-center justify-center transition-all ${
            isListening
              ? "bg-red-500 hover:bg-red-600 animate-pulse"
              : "bg-emerald-500 hover:bg-emerald-600"
          } ${isProcessing ? "opacity-50 cursor-not-allowed" : "opacity-100"}`}
        >
          {isProcessing ? (
            <Loader2 className="h-6 w-6 text-white animate-spin" />
          ) : isListening ? (
            <Square className="h-6 w-6 text-white" />
          ) : (
            <Mic className="h-6 w-6 text-white" />
          )}
        </button>

        <p
          className={`text-sm uppercase tracking-wider font-medium ${
            isDarkMode ? "text-emerald-400" : "text-emerald-600"
          }`}
        >
          {isProcessing ? (
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
        </p>
      </div>
    </div>
  );
}
