"use client";

import { useRef, useState, useEffect } from "react";
import { Mic, MicOff } from "lucide-react";

export interface AudioVisualizerProps {
  isActive?: boolean;
  audioData?: Uint8Array;
  isProcessing?: boolean;
  isGenerating?: boolean;
}

export default function AudioVisualizer({
  isActive = false,
  audioData,
  isProcessing = false,
  isGenerating = false,
}: AudioVisualizerProps) {
  const [isBlinking, setIsBlinking] = useState(false);
  const [audioLevels, setAudioLevels] = useState<number[]>(Array(10).fill(0));
  const [showVisualizer, setShowVisualizer] = useState(false);
  const animationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityTimeRef = useRef<number>(0);
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const prevAudioDataRef = useRef<Uint8Array | null>(null);
  const prevIsActiveRef = useRef<boolean>(false);
  const prevIsGeneratingRef = useRef<boolean>(false);

  // Force reset visualizer when isActive changes from true to false
  useEffect(() => {
    if (!isActive && showVisualizer) {
      console.log("🔇 [Visualizer] Audio visualization stopped");
      setShowVisualizer(false);
      setAudioLevels(Array(10).fill(0));
    }

    // Handle the transition from active to inactive
    if (prevIsActiveRef.current && !isActive) {
      // Reset animation state when becoming inactive
      setIsBlinking(false);
      setShowVisualizer(false);
      setAudioLevels(Array(10).fill(0));
    }

    // Store current state for next comparison
    prevIsActiveRef.current = isActive;
  }, [isActive, showVisualizer]);

  // Handle the transition when AI stops generating (specific for the robot face state)
  useEffect(() => {
    // When isGenerating transitions from true to false
    if (prevIsGeneratingRef.current && !isGenerating) {
      console.log(
        "🎭 [Visualizer] AI generation stopped, resetting visualization"
      );
      // Immediately force reset all visualizer states when AI stops generating
      setShowVisualizer(false);
      setAudioLevels(Array(10).fill(0));

      // Cancel any pending silence timeout
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
        silenceTimeoutRef.current = null;
      }

      // Force re-check after a short delay to ensure visualizer stays hidden
      const forceHideTimer = setTimeout(() => {
        setShowVisualizer(false);
        setAudioLevels(Array(10).fill(0));
      }, 50);

      return () => clearTimeout(forceHideTimer);
    }

    // Store current state for next comparison
    prevIsGeneratingRef.current = isGenerating;
  }, [isGenerating]);

  // Process audio data when available
  useEffect(() => {
    // Clear any existing interval on re-render
    if (animationIntervalRef.current) {
      clearInterval(animationIntervalRef.current);
      animationIntervalRef.current = null;
    }

    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }

    // Check if audio data is silent (all zeros or very small values)
    const isAudioDataSilent = (data?: Uint8Array): boolean => {
      if (!data || data.length === 0) return true;
      // More lenient threshold for AI speech
      const threshold = isGenerating ? 1 : 2;
      return !Array.from(data).some((value) => value > threshold);
    };

    // Function to process audio data and update levels
    const updateAudioVisualizer = () => {
      // If not active at all, immediately hide visualizer regardless of other conditions
      if (!isActive) {
        if (showVisualizer) {
          console.log(
            "⛔ [Visualizer] Force stopping visualization - isActive is false"
          );
          setShowVisualizer(false);
          setAudioLevels(Array(10).fill(0));
        }
        return;
      }

      // Special handling for AI generation - keep visualization active
      if (isGenerating) {
        if (!showVisualizer) {
          console.log("🤖 [Visualizer] Starting AI speech visualization");
          setShowVisualizer(true);
        }
        // Generate smooth wave-like motion for AI speech
        const newLevels = Array(10)
          .fill(0)
          .map((_, i) => {
            const time = Date.now() / 1000; // Use time for smooth animation
            const value = 0.5 + 0.3 * Math.sin(time * 4 + i * 0.5);
            return value;
          });
        setAudioLevels(newLevels);
        return;
      }

      // Regular audio visualization logic (we already checked !isActive above)
      // Check if we have audio data
      if (audioData) {
        const currentAudioData = audioData;
        const isSilent = isAudioDataSilent(currentAudioData);

        if (!isSilent) {
          lastActivityTimeRef.current = Date.now();
          const newLevels = Array(10)
            .fill(0)
            .map((_, i) => {
              const index = Math.floor((i / 20) * currentAudioData.length);
              let value = (currentAudioData[index] || 0) / 255;
              value = Math.pow(value, 0.4) * 1.8;
              return value > 0.01 ? Math.max(0.2, value) : 0;
            });

          const hasSignificantLevel = newLevels.some((level) => level > 0.05);
          if (!showVisualizer && hasSignificantLevel) {
            console.log("🎵 [Visualizer] Starting audio visualization");
            setShowVisualizer(true);
          }

          setAudioLevels(newLevels);
        } else if (showVisualizer) {
          // Add gradual fade-out for smoother transition
          setAudioLevels((prev) =>
            prev.map((level) => Math.max(0, level * 0.9))
          );

          // Check if all levels are very low before hiding
          if (audioLevels.every((level) => level < 0.05)) {
            console.log(
              "📉 [Visualizer] Audio faded out, hiding visualization"
            );
            setShowVisualizer(false);
          }
        }

        prevAudioDataRef.current = currentAudioData;
      }
    };

    // Set up the interval for constant updates with faster refresh rate
    animationIntervalRef.current = setInterval(updateAudioVisualizer, 16);

    return () => {
      if (animationIntervalRef.current) {
        clearInterval(animationIntervalRef.current);
      }
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
      }
    };
  }, [isActive, audioData, showVisualizer, isGenerating, audioLevels]);

  // Handle blinking animation
  useEffect(() => {
    const blink = () => {
      setIsBlinking(true);
      setTimeout(() => setIsBlinking(false), 150); // Duration of blink
    };

    const scheduleNextBlink = () => {
      const minDelay = isActive ? 3000 : 4000; // Less frequent blinks (was 1000:2000)
      const maxDelay = isActive ? 6000 : 10000; // Increased max delay (was 3000:6000)
      const delay = Math.random() * (maxDelay - minDelay) + minDelay;

      const timer = setTimeout(() => {
        blink();
        scheduleNextBlink();
      }, delay);
      return timer;
    };

    // Start the blinking cycle
    const timer = setTimeout(() => scheduleNextBlink(), 1000);

    return () => {
      clearTimeout(timer);
    };
  }, [isActive]);

  return (
    <div
      className={`flex items-center justify-center w-full ${
        isProcessing ? "opacity-50" : ""
      }`}
    >
      <div className="relative w-64 h-64 bg-slate-900 rounded-lg shadow-xl overflow-hidden">
        {/* Inner face container */}
        <div className="absolute inset-4 bg-gray-700 rounded-md flex flex-col items-center justify-center">
          {/* Antennas */}
          <div className="absolute top-0 left-1/4 w-1.5 h-8 bg-gray-500 -translate-y-4">
            <div
              className={`absolute top-0 w-3 h-3 ${
                isGenerating ? "bg-purple-500 animate-pulse" : "bg-red-500"
              } rounded-full -translate-x-1/4`}
            ></div>
          </div>
          <div className="absolute top-0 right-1/4 w-1.5 h-8 bg-gray-500 -translate-y-4">
            <div
              className={`absolute top-0 w-3 h-3 ${
                isGenerating ? "bg-purple-500 animate-pulse" : "bg-green-500"
              } rounded-full -translate-x-1/4`}
            ></div>
          </div>

          {/* Eyes */}
          <div className="flex gap-12 mb-8">
            {/* Left Eye */}
            <div className="relative w-12 h-12">
              <div
                className={`absolute inset-0 ${
                  isGenerating ? "bg-indigo-200" : "bg-blue-200"
                } rounded-full transition-transform duration-150 ${
                  isBlinking ? "scale-y-[0.1]" : "scale-100"
                }`}
              >
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full opacity-80"></div>
              </div>
            </div>
            {/* Right Eye */}
            <div className="relative w-12 h-12">
              <div
                className={`absolute inset-0 ${
                  isGenerating ? "bg-indigo-200" : "bg-blue-200"
                } rounded-full transition-transform duration-150 ${
                  isBlinking ? "scale-y-[0.1]" : "scale-100"
                }`}
              >
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full opacity-80"></div>
              </div>
            </div>
          </div>

          {/* Nose */}
          <div
            className={`w-2 h-6 ${
              isGenerating ? "bg-indigo-400" : "bg-gray-500"
            } rounded-full mb-4`}
          ></div>

          {/* Mouth - either audio visualizer or simple line to match the image */}
          {isActive &&
          showVisualizer &&
          !!audioData &&
          audioData.length > 0 &&
          // Check if audio levels are not all near zero
          audioLevels.some((level) => level > 0.05) ? (
            <div className="w-24 h-8 flex items-center justify-center gap-1">
              {audioLevels.map((level, i) => {
                // Increased amplitude for more dramatic movement
                const barHeight = Math.sin((i / 10) * Math.PI) * level * 40 + 4;
                return (
                  <div
                    key={i}
                    className={`w-1.5 bg-slate-900 rounded-full transition-all duration-50`}
                    style={{ height: `${barHeight}px` }}
                  ></div>
                );
              })}
            </div>
          ) : (
            <div
              className={`w-20 h-1.5 ${
                isGenerating ? "bg-indigo-900" : "bg-slate-900"
              } rounded-full transition-all duration-150`}
            ></div>
          )}
        </div>
      </div>
    </div>
  );
}
