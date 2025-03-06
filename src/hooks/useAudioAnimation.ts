"use client";

import { useState, useEffect } from "react";

interface UseAudioAnimationProps {
  isAudioPlaying: boolean;
  isListening: boolean;
}

export default function useAudioAnimation({
  isAudioPlaying,
  isListening,
}: UseAudioAnimationProps) {
  const [audioLevel, setAudioLevel] = useState(0);
  const [brainActivity, setBrainActivity] = useState(Array(12).fill(0));

  // Effect to animate audio bars when audio is playing
  useEffect(() => {
    let animationInterval: NodeJS.Timeout | null = null;

    if (isAudioPlaying && isListening) {
      // Update the visualizer every 100ms to create animation
      animationInterval = setInterval(() => {
        // Force re-render to get new random heights
        setAudioLevel((prev) => (prev > 0.5 ? 0.3 : 0.7));
      }, 100);
    } else {
      // Ensure animation stops and level is reset when not active
      setAudioLevel(0);
    }

    return () => {
      if (animationInterval) {
        clearInterval(animationInterval);
      }
    };
  }, [isAudioPlaying, isListening]);

  // Simulate brain activity for the visualization
  useEffect(() => {
    const interval = setInterval(() => {
      setBrainActivity((prev) => prev.map(() => Math.random() * 100));
    }, 800);

    return () => clearInterval(interval);
  }, []);

  return { audioLevel, brainActivity };
}
