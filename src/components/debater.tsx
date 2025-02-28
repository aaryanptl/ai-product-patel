"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "./ui/button";
import { Mic, Square } from "lucide-react";
import { Message } from "ai";
import AudioVisualizer from "./user-voice-visualizer";
import useWebRTCAudioSession from "@/hooks/use-webrtc";

interface DebaterProps {
  onTranscriptReceived: (text: string, speaker: "AI" | "Human") => void;
  onAudioResponse: (audioBlob: Blob) => void;
  messages?: Message[];
  onProcessingChange?: (isProcessing: boolean) => void;
  onAiTypingChange?: (isTyping: boolean) => void;
}

export default function Debater({
  onTranscriptReceived,
  onAudioResponse,
  messages = [],
  onProcessingChange,
  onAiTypingChange,
}: DebaterProps) {
  const [voice, setVoice] = useState("alloy");
  const [isProcessing, setIsProcessing] = useState(false);
  const [userInput, setUserInput] = useState("");
  const lastVolumeUpdateRef = useRef(0);
  const lastSentVolumeRef = useRef(0);

  // Keep track of the current assistant message that's being built
  const currentAssistantMessageRef = useRef<string>("");
  const [assistantIsResponding, setAssistantIsResponding] = useState(false);

  // Use our WebRTC hook
  const {
    status,
    isSessionActive,
    audioIndicatorRef,
    handleStartStopClick,
    conversation,
    currentVolume,
    sendTextMessage,
  } = useWebRTCAudioSession(voice);

  // When the conversation updates, process the messages
  useEffect(() => {
    if (conversation.length === 0) return;

    const latestMessage = conversation[conversation.length - 1];

    if (!latestMessage.text) return;

    // Handle user messages - send these through immediately
    if (latestMessage.role === "user" && latestMessage.isFinal) {
      onTranscriptReceived(latestMessage.text, "Human");
      return;
    }

    // Handle assistant messages
    if (latestMessage.role === "assistant") {
      // If the message is final, send the complete message
      if (latestMessage.isFinal) {
        setAssistantIsResponding(false);
        onAiTypingChange?.(false);
        onTranscriptReceived(latestMessage.text, "AI");
        currentAssistantMessageRef.current = "";
      } else {
        // Otherwise, mark that the assistant is responding but don't send the partial message
        setAssistantIsResponding(true);
        onAiTypingChange?.(true);
        currentAssistantMessageRef.current = latestMessage.text;
      }
    }
  }, [conversation, onTranscriptReceived, onAiTypingChange]);

  // Update processing state
  useEffect(() => {
    const isProc =
      status.includes("Requesting") ||
      status.includes("Fetching") ||
      status.includes("Establishing");
    setIsProcessing(isProc);
    onProcessingChange?.(isProc);
  }, [status, onProcessingChange]);

  // Throttled function to send audio visualization data
  const sendVisualizationData = useCallback(() => {
    if (!isSessionActive) return;

    const now = Date.now();
    // Only send visualization updates every 100ms to prevent infinite loops
    if (now - lastVolumeUpdateRef.current < 100) return;
    lastVolumeUpdateRef.current = now;

    // Only send if volume has changed significantly
    if (Math.abs(currentVolume - lastSentVolumeRef.current) < 0.05) return;
    lastSentVolumeRef.current = currentVolume;

    // Create dummy data for visualization based on volume
    const dataSize = 128;
    const volumeData = new Uint8Array(dataSize);
    const scaledVolume = Math.min(255, Math.floor(currentVolume * 255));

    for (let i = 0; i < dataSize; i++) {
      volumeData[i] = Math.floor(Math.random() * scaledVolume);
    }

    onAudioResponse(
      new Blob([volumeData], { type: "application/octet-stream" })
    );
  }, [currentVolume, isSessionActive, onAudioResponse]);

  // Send audio visualization data with throttling
  useEffect(() => {
    if (isSessionActive && currentVolume > 0) {
      sendVisualizationData();
    }
  }, [currentVolume, isSessionActive, sendVisualizationData]);

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
            {isSessionActive ? (
              <Square className="w-5 h-5 text-red-500 transition-transform duration-200 transform" />
            ) : (
              <Mic
                className={`
                w-5 h-5 transition-transform duration-200 transform hover:scale-110
                ${isProcessing ? "text-slate-400" : "text-green-500"}
              `}
              />
            )}
          </div>
        </Button>
      </div>
    </div>
  );
}
