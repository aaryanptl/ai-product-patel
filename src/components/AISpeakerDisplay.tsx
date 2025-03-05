"use client";

import { useState, useEffect } from "react";
import { Loader2, Square, Mic } from "lucide-react";
import AudioPulseIndicator from "./AudioPulseIndicator";

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
  return (
    <div className="flex-1 border border-emerald-500/30 rounded-2xl bg-black/40 backdrop-blur-sm overflow-hidden flex flex-col">
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="relative">
          {/* Outer rings */}
          <div className="absolute inset-0 rounded-full border-2 border-emerald-500/30 animate-[spin_10s_linear_infinite]" />
          <div className="absolute inset-[-15px] rounded-full border border-emerald-400/20 animate-[spin_15s_linear_infinite_reverse]" />
          <div className="absolute inset-[-30px] rounded-full border border-emerald-300/10 animate-[spin_20s_linear_infinite]" />

          {/* Brain activity visualization */}
          <div className="absolute inset-[-60px] flex items-center justify-center">
            {brainActivity.map((value, i) => (
              <div
                key={i}
                className="absolute h-20 w-1 bg-emerald-400/30"
                style={{
                  transform: `rotate(${i * 30}deg)`,
                  height: `${value}px`,
                  opacity: value / 100,
                }}
              />
            ))}
          </div>

          {/* Main AI face */}
          <div className="relative w-64 h-64 rounded-full bg-gradient-to-br from-black to-emerald-950 border border-emerald-500/50 flex items-center justify-center overflow-hidden">
            <div className="absolute inset-2 rounded-full bg-black/80" />

            {/* AI eyes */}
            <div className="relative z-10 flex gap-16">
              <div className="w-6 h-6 bg-emerald-400 rounded-sm animate-pulse" />
              <div className="w-6 h-6 bg-emerald-400 rounded-sm animate-pulse" />
            </div>

            {/* Audio visualizer */}
            <div className="absolute bottom-12 left-0 right-0 flex justify-center gap-1">
              {Array.from({ length: 12 }).map((_, i) => (
                <div
                  key={i}
                  className="w-1 bg-emerald-400/80 rounded-full transition-all duration-100"
                  style={{
                    height: isAudioPlaying
                      ? `${Math.random() * 20 + 2}px`
                      : "2px",
                    opacity: isAudioPlaying ? 0.5 + Math.random() * 0.5 : 0.3,
                  }}
                />
              ))}
            </div>

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
