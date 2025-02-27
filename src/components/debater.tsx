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
      <div className="w-full max-w-2xl mx-auto">
        <div ref={audioIndicatorRef} className="audio-indicator">
          <AudioVisualizer stream={null} />
        </div>
      </div>
      <div className="flex justify-center items-center space-x-4">
        <Button
          onClick={handleStartStopClick}
          disabled={isProcessing}
          variant="ghost"
          size="lg"
          className={`
            relative w-16 h-16 rounded-full p-0 
            transition-all duration-200 ease-in-out
            hover:bg-slate-100 dark:hover:bg-slate-800
            ${
              isSessionActive
                ? "bg-red-500/10 border-2 border-red-500"
                : "bg-green-500/10 border-2 border-green-500"
            }
            ${isProcessing ? "opacity-50 cursor-not-allowed" : ""}
          `}
        >
          <div
            className={`
            absolute inset-0 rounded-full
            ${isSessionActive ? "animate-ping bg-red-500/30" : ""}
          `}
          />
          {isSessionActive ? (
            <Square className="w-5 h-5 text-red-500 relative z-10" />
          ) : (
            <Mic
              className={`
              w-5 h-5 relative z-10
              ${isProcessing ? "text-slate-400" : "text-green-500"}
            `}
            />
          )}
        </Button>
      </div>

      <div className="text-center text-sm font-medium">
        {isSessionActive ? (
          <p className="text-red-500">Session Active - Click square to end</p>
        ) : (
          <p className="text-green-500">Click mic to start conversation</p>
        )}
      </div>

      {isSessionActive && (
        <div className="flex justify-center mt-4">
          <form onSubmit={handleSubmitText} className="w-full max-w-md">
            <div className="flex gap-2">
              <input
                type="text"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                className="w-full p-2 rounded-md bg-black/20 border border-gray-700 text-white"
                placeholder={
                  assistantIsResponding
                    ? "AI is responding..."
                    : "Type a message to send..."
                }
                disabled={assistantIsResponding}
              />
              <Button
                type="submit"
                disabled={!userInput.trim() || assistantIsResponding}
              >
                Send
              </Button>
            </div>
          </form>
        </div>
      )}
      <div className="text-center text-sm text-gray-500">
        {status && <p>{status}</p>}
        {assistantIsResponding && (
          <p className="text-green-500 animate-pulse mt-1">
            AI is responding...
          </p>
        )}
      </div>
    </div>
  );
}
