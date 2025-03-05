"use client";

import { useCallback, useRef } from "react";

interface AudioControllerProps {
  isListening: boolean;
  isAudioPlaying: boolean;
  setRecentUserAudio: (base64data: string) => void;
  setRecentAIAudio: (base64data: string) => void;
}

export default function AudioController({
  isListening,
  isAudioPlaying,
  setRecentUserAudio,
  setRecentAIAudio,
}: AudioControllerProps) {
  // References for audio handling
  const lastAudioUpdateTimeRef = useRef(0);
  const lastSpeakerRef = useRef<"AI" | "Human" | null>(null);
  const lastTranscriptTimestampRef = useRef(0);
  const userAudioBufferRef = useRef<Blob[]>([]);
  const aiAudioBufferRef = useRef<Blob[]>([]);

  // Modified function to handle audio response and collect audio data
  const handleAudioResponse = useCallback(
    async (audioBlob: Blob) => {
      if (audioBlob.size === 0 || !isListening) {
        // When we receive an empty blob or listening is off, clear immediately
        // Also clear the audio buffers
        userAudioBufferRef.current = [];
        aiAudioBufferRef.current = [];
        return;
      }

      if (audioBlob.type === "application/octet-stream") {
        // Throttle updates to prevent excessive re-renders
        const now = Date.now();
        if (now - lastAudioUpdateTimeRef.current < 50) {
          return; // Skip this update if less than 50ms since last update
        }
        lastAudioUpdateTimeRef.current = now;

        const arrayBuffer = await audioBlob.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);

        // Only update audio data if there's actual audio content
        const hasAudioContent = uint8Array.some((val) => val > 0);

        // Collect audio data for the current speaker
        if (lastSpeakerRef.current === "Human") {
          userAudioBufferRef.current.push(audioBlob);
        } else if (lastSpeakerRef.current === "AI") {
          aiAudioBufferRef.current.push(audioBlob);
        }
      } else if (audioBlob.type.startsWith("audio/")) {
        // This is actual audio data (not visualization data)
        if (lastSpeakerRef.current === "Human") {
          userAudioBufferRef.current.push(audioBlob);
        } else if (lastSpeakerRef.current === "AI") {
          aiAudioBufferRef.current.push(audioBlob);
        }
      }
    },
    [isAudioPlaying, isListening]
  );

  // Function to process collected audio buffer and convert to base64
  const processAudioBuffer = useCallback(
    (speaker: "AI" | "Human") => {
      if (speaker === "Human" && userAudioBufferRef.current.length > 0) {
        const blob = new Blob(userAudioBufferRef.current, {
          type: "audio/mp3",
        });
        userAudioBufferRef.current = []; // Clear buffer after processing

        // Convert to base64
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64data = (reader.result as string)?.split(",")[1] || "";
          setRecentUserAudio(base64data);
        };
        reader.readAsDataURL(blob);
      } else if (speaker === "AI" && aiAudioBufferRef.current.length > 0) {
        const blob = new Blob(aiAudioBufferRef.current, { type: "audio/mp3" });
        aiAudioBufferRef.current = []; // Clear buffer after processing

        // Convert to base64
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64data = (reader.result as string)?.split(",")[1] || "";
          setRecentAIAudio(base64data);
        };
        reader.readAsDataURL(blob);
      }
    },
    [setRecentUserAudio, setRecentAIAudio]
  );

  // Handle when a new transcript is received
  const handleTranscriptReceived = useCallback(
    (text: string, speaker: "AI" | "Human") => {
      if (!text.trim()) return;

      const now = Date.now();

      // Prevent duplicates and rapid updates
      if (now - lastTranscriptTimestampRef.current < 300) {
        return;
      }
      lastTranscriptTimestampRef.current = now;

      // Track the current speaker for audio collection
      lastSpeakerRef.current = speaker;

      // If speaker changed, process the audio from previous speaker
      if (speaker === "Human" && aiAudioBufferRef.current.length > 0) {
        // Process AI audio when user starts speaking
        processAudioBuffer("AI");
      } else if (speaker === "AI" && userAudioBufferRef.current.length > 0) {
        // Process user audio when AI starts speaking
        processAudioBuffer("Human");
      }
    },
    [processAudioBuffer]
  );

  return {
    handleAudioResponse,
    handleTranscriptReceived,
    processAudioBuffer,
  };
}
