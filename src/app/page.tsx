"use client";

import AudiencePoll from "@/components/audience-poll";
import Debater from "@/components/debater";
import LiveTranscript from "@/components/live-transcript";
import AudioVisualizer from "@/components/audio-visualizer";
import { Card } from "@/components/ui/card";
import { Message } from "ai";
import { motion } from "framer-motion";
import { useEffect, useRef, useState, useCallback } from "react";

export default function Home() {
  const [transcript, setTranscript] = useState<
    Array<{ text: string; speaker: "AI" | "Human"; timestamp?: number }>
  >([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [audioData, setAudioData] = useState<Uint8Array | undefined>();
  const [isPlaying, setIsPlaying] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [aiIsTyping, setAiIsTyping] = useState(false);
  const lastAudioUpdateTimeRef = useRef(0);

  // Track AI responses to prevent duplicates
  const lastTranscriptTimestampRef = useRef(0);

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

      // Add to transcript with timestamp for ordering and duplicate detection
      setTranscript((prev) => {
        // Check for duplicates or very similar messages (AI often repeats with small changes)
        const isDuplicate = prev.some((item) => {
          if (item.speaker !== speaker) return false;

          // For AI, check if the message is very similar (fuzzy match)
          if (speaker === "AI") {
            // Compare removing spaces and punctuation
            const normalize = (str: string) =>
              str.toLowerCase().replace(/[^\w]/g, "");
            const similarity =
              normalize(item.text).includes(normalize(text)) ||
              normalize(text).includes(normalize(item.text));

            // If texts are similar and within 2 seconds, consider it a duplicate
            return similarity && item.timestamp && now - item.timestamp < 2000;
          }

          // For humans, exact match is enough
          return item.text === text;
        });

        if (isDuplicate) return prev;

        return [...prev, { text, speaker, timestamp: now }];
      });

      // Add message to chat history
      const newMessage: Message = {
        id: `${speaker}-${now}`,
        role: speaker === "AI" ? "assistant" : "user",
        content: text,
      };

      setMessages((prev) => {
        // Check for exact duplicates in messages
        if (
          prev.some(
            (msg) => msg.content === text && msg.role === newMessage.role
          )
        ) {
          return prev;
        }
        return [...prev, newMessage];
      });
    },
    []
  );

  // Handle audio data for visualization with throttling
  const handleAudioResponse = useCallback(
    async (audioBlob: Blob) => {
      if (audioBlob.type === "application/octet-stream") {
        // Throttle updates to prevent excessive re-renders
        const now = Date.now();
        if (now - lastAudioUpdateTimeRef.current < 50) {
          return; // Skip this update if less than 50ms since last update
        }
        lastAudioUpdateTimeRef.current = now;

        const arrayBuffer = await audioBlob.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        setAudioData(uint8Array);

        // Don't set isPlaying in every audio update to avoid loops
        if (!isPlaying) {
          setIsPlaying(true);
        }
      }
    },
    [isPlaying]
  );

  // Toggle playback for transcript UI (doesn't actually affect audio)
  const togglePlayback = useCallback(() => {
    setIsPlaying((prev) => !prev);
  }, []);

  // Reset playing status when processing stops, but only once
  useEffect(() => {
    if (!isProcessing && !isPlaying) {
      setIsPlaying(true);
    }
  }, [isProcessing, isPlaying]);

  // Handle AI typing state changes
  const handleAiTypingChange = useCallback((isTyping: boolean) => {
    setAiIsTyping(isTyping);
  }, []);

  return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-6xl space-y-6">
        <div className="py-8">
          <motion.h1
            className="text-4xl font-bold text-center bg-gradient-to-r from-teal-400 to-emerald-500 bg-clip-text text-transparent"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            Human vs AI: The Great Debate
          </motion.h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 bg-zinc-900/50 border-zinc-800 backdrop-blur-xl rounded-3xl overflow-hidden">
            <AudioVisualizer
              isActive={!!audioData && isPlaying}
              audioData={audioData}
              isProcessing={isProcessing}
            />
            <div className="p-6 space-y-4">
              <Debater
                onTranscriptReceived={handleTranscriptReceived}
                onAudioResponse={handleAudioResponse}
                messages={messages}
                onProcessingChange={setIsProcessing}
                onAiTypingChange={handleAiTypingChange}
              />
            </div>
          </Card>

          <div className="space-y-6">
            <LiveTranscript
              transcript={transcript}
              isPlaying={isPlaying}
              onTogglePlayback={togglePlayback}
              aiIsTyping={aiIsTyping}
            />
            <AudiencePoll />
          </div>
        </div>
      </div>
    </main>
  );
}
