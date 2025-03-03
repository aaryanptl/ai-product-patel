"use client";

import useWebRTCAudioSession from "@/hooks/use-webrtc";
import { Message } from "ai";
import { Loader2, Mic, Square } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "./ui/button";

interface DebaterProps {
  onTranscriptReceived: (text: string, speaker: "AI" | "Human") => void;
  onAudioResponse: (audioBlob: Blob) => void;
  messages?: Message[];
  onProcessingChange?: (isProcessing: boolean) => void;
  onAiTypingChange?: (isTyping: boolean) => void;
  onAudioPlayingChange?: (isPlaying: boolean) => void;
  onSessionStatusChange?: (status: string) => void;
  customInstructions?: string;
}

export default function Debater({
  onTranscriptReceived,
  onAudioResponse,
  messages = [],
  onProcessingChange,
  onAiTypingChange,
  onAudioPlayingChange,
  onSessionStatusChange,
  customInstructions,
}: DebaterProps) {
  const [voice, setVoice] = useState("alloy");
  const [isProcessing, setIsProcessing] = useState(false);
  const [userInput, setUserInput] = useState("");
  const lastVolumeUpdateRef = useRef(0);
  const lastSentVolumeRef = useRef(0);

  // Keep track of the current assistant message that's being built
  const currentAssistantMessageRef = useRef<string>("");
  const [assistantIsResponding, setAssistantIsResponding] = useState(false);

  // Handle session status changes
  const handleStatusChange = useCallback(
    (status: string) => {
      console.log(`🔄 [Debater] Session status changed: ${status}`);
      onSessionStatusChange?.(status);
    },
    [onSessionStatusChange]
  );

  // Use our WebRTC hook with custom instructions
  const {
    status,
    isSessionActive,
    audioIndicatorRef,
    handleStartStopClick,
    conversation,
    currentVolume,
    sendTextMessage,
    isAudioPlaying,
  } = useWebRTCAudioSession(
    voice,
    undefined,
    handleStatusChange,
    customInstructions
  );

  // Keep track of previous instructions to detect changes
  const prevInstructionsRef = useRef<string>("");

  // Effect to handle custom instructions changes
  useEffect(() => {
    // Only stop the session if instructions have changed and are not empty
    const currentInstructions = customInstructions || "";
    if (
      currentInstructions !== prevInstructionsRef.current &&
      currentInstructions.trim() !== ""
    ) {
      prevInstructionsRef.current = currentInstructions;
      if (isSessionActive) {
        handleStartStopClick();
      }
    }
  }, [customInstructions, isSessionActive, handleStartStopClick]);

  // When the conversation updates, process the messages
  useEffect(() => {
    if (conversation.length === 0) return;

    const latestMessage = conversation[conversation.length - 1];

    if (!latestMessage.text) return;

    // Handle user messages - send these through immediately
    if (latestMessage.role === "user" && latestMessage.isFinal) {
      console.log("👤 [Audio Status] Processing final user message");
      onTranscriptReceived(latestMessage.text, "Human");
      // Only reset audio when switching from AI to user
      if (currentAssistantMessageRef.current) {
        onAudioResponse(new Blob([], { type: "application/octet-stream" }));
        currentAssistantMessageRef.current = "";
      }
      return;
    }

    // Handle assistant messages
    if (latestMessage.role === "assistant") {
      // If the message is final, send the complete message
      if (latestMessage.isFinal) {
        console.log("🤖 [Audio Status] AI message completed");
        setAssistantIsResponding(false);
        onAiTypingChange?.(false);
        onTranscriptReceived(latestMessage.text, "AI");
        currentAssistantMessageRef.current = "";

        // Add a delay before sending empty audio data to ensure smooth transition
        setTimeout(() => {
          console.log(
            "🔇 [Audio Status] Sending empty audio data after AI message complete"
          );
          onAudioResponse(new Blob([], { type: "application/octet-stream" }));
        }, 1000);
      } else {
        // Otherwise, mark that the assistant is responding
        console.log("🎯 [Audio Status] AI started responding");
        setAssistantIsResponding(true);
        onAiTypingChange?.(true);
        currentAssistantMessageRef.current = latestMessage.text;
      }
    }
  }, [conversation, onTranscriptReceived, onAiTypingChange, onAudioResponse]);

  // Throttled function to send audio visualization data
  const sendVisualizationData = useCallback(() => {
    if (!isSessionActive) return;

    // Return immediately if audio is not playing - this is key to prevent any visualization
    if (!isAudioPlaying) {
      // Only send an empty blob if needed
      if (lastSentVolumeRef.current > 0) {
        lastSentVolumeRef.current = 0;
        onAudioResponse(new Blob([], { type: "application/octet-stream" }));
      }
      return;
    }

    const now = Date.now();
    // Only send visualization updates every 100ms to prevent excessive re-renders
    if (now - lastVolumeUpdateRef.current < 100) return;
    lastVolumeUpdateRef.current = now;

    // Only send if volume has changed significantly
    if (Math.abs(currentVolume - lastSentVolumeRef.current) < 0.05) return;
    lastSentVolumeRef.current = currentVolume;

    // Create dummy data for visualization based on volume
    const dataSize = 128;
    const volumeData = new Uint8Array(dataSize);

    // Create visualizations with actual audio volume data
    const scaledVolume = Math.min(255, Math.floor(currentVolume * 255));
    // Add some randomness for a more natural visualization
    for (let i = 0; i < dataSize; i++) {
      volumeData[i] = Math.floor(Math.random() * scaledVolume);
    }

    // Send the visualization data
    onAudioResponse(
      new Blob([volumeData], { type: "application/octet-stream" })
    );
  }, [currentVolume, isSessionActive, onAudioResponse, isAudioPlaying]);

  // Send audio visualization data with throttling
  useEffect(() => {
    let visualizationInterval: NodeJS.Timeout | null = null;

    if (isSessionActive) {
      visualizationInterval = setInterval(() => {
        sendVisualizationData();
      }, 100);
    }

    return () => {
      if (visualizationInterval) {
        clearInterval(visualizationInterval);
      }
    };
  }, [isSessionActive, sendVisualizationData]);

  // Log whenever audio playback state changes
  useEffect(() => {
    if (isAudioPlaying) {
      console.log("🔈 [Audio Status] Audio playback started");
      // Notify parent component about audio playing state
      onAudioPlayingChange?.(true);

      // Immediately send initial visualization data
      const dataSize = 128;
      const initialData = new Uint8Array(dataSize);
      for (let i = 0; i < dataSize; i++) {
        initialData[i] = Math.floor(Math.random() * 200); // Strong initial visualization
      }
      onAudioResponse(
        new Blob([initialData], { type: "application/octet-stream" })
      );
    } else {
      console.log("🔇 [Audio Status] Audio playback stopped");
      // Explicitly notify parent about audio stopping
      onAudioPlayingChange?.(false);

      // Immediately clear visualization when audio stops playing
      onAudioResponse(new Blob([], { type: "application/octet-stream" }));
    }
  }, [isAudioPlaying, onAudioResponse, onAudioPlayingChange]);

  // Update processing state
  useEffect(() => {
    const isProc =
      status.includes("Requesting") ||
      status.includes("Fetching") ||
      status.includes("Establishing");
    setIsProcessing(isProc);
    onProcessingChange?.(isProc);
  }, [status, onProcessingChange]);

  // Handle text submission
  const handleSubmitText = (e: React.FormEvent) => {
    e.preventDefault();
    if (userInput.trim() && isSessionActive) {
      sendTextMessage(userInput.trim());
      setUserInput("");
    }
  };

  return (
    <div className="space-y-4">
      {/* Session Status Indicator */}
      {isProcessing && (
        <div className="bg-black/80 border border-emerald-500/30 rounded-lg p-3 mb-2 text-center">
          <div className="flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 text-emerald-400 animate-spin" />
            <p className="text-emerald-400 text-sm font-medium">{status}</p>
          </div>
        </div>
      )}

      <div className="flex justify-center items-center space-x-4">
        <Button
          onClick={handleStartStopClick}
          disabled={isProcessing}
          variant="ghost"
          size="lg"
          className={`
            debater-mic-button
            relative size-20 rounded-full p-0 
            transition-all duration-300 ease-in-out
            shadow-md hover:shadow-lg
            ${
              isSessionActive
                ? "bg-red-500/10 border-2 border-red-500 hover:bg-red-500/20"
                : "bg-green-500/10 border-2 border-green-500 hover:bg-green-500/20"
            }
            ${isProcessing ? "opacity-50 cursor-not-allowed" : ""}
          `}
        >
          <div
            className={`
            absolute inset-0 rounded-full opacity-60
            ${isSessionActive ? "animate-pulse bg-red-500/20" : ""}
          `}
          />
          <div className="relative z-10 flex items-center justify-center">
            {isProcessing ? (
              <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
            ) : isSessionActive ? (
              <Square className="w-5 h-5 text-red-500 transition-transform duration-200 transform" />
            ) : (
              <Mic
                className={`
                w-5 h-5 transition-transform duration-200 transform hover:scale-110
                text-green-500
              `}
              />
            )}
          </div>
        </Button>
      </div>
    </div>
  );
}
