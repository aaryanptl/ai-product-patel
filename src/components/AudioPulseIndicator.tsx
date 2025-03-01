"use client";

import { useEffect, useState } from "react";

interface AudioPulseIndicatorProps {
  isListening: boolean;
  audioLevel: number;
}

export default function AudioPulseIndicator({
  isListening,
  audioLevel,
}: AudioPulseIndicatorProps) {
  const [pulseEffect, setPulseEffect] = useState(false);
  const [displayLevel, setDisplayLevel] = useState(0);

  // Effect to control pulse animation
  useEffect(() => {
    if (isListening) {
      setPulseEffect(true);
    } else {
      // When listening stops, immediately stop the pulse effect
      setPulseEffect(false);
      // Also reset display level to ensure circle is not visible
      setDisplayLevel(0);
    }
  }, [isListening]);

  // Effect to update display level with some smoothing
  useEffect(() => {
    if (isListening) {
      setDisplayLevel(audioLevel);
    } else {
      // Ensure level is reset when not listening
      setDisplayLevel(0);
    }
  }, [audioLevel, isListening]);

  return (
    <>
      {/* Pulse effect */}
      <div
        className={`absolute inset-0 rounded-full bg-emerald-400/20 transition-all duration-300 ${
          pulseEffect ? "animate-ping" : "opacity-0"
        }`}
      />

      {/* Audio level indicator */}
      <div className="absolute -inset-3 rounded-full border border-emerald-400/30" />
    </>
  );
}
