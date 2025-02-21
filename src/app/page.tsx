"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import SphereVisualizer from "@/components/SphereVisualizer";
import WaveformVisualizer from "@/components/WaveformVisualizer";
import LiveTranscript from "@/components/LiveTranscript";
import AudiencePoll from "@/components/AudiencePoll";
import { Message } from "ai";
import Debater from "@/components/debater";

export default function Home() {
  const [transcript, setTranscript] = useState<
    Array<{ text: string; speaker: "AI" | "Human" }>
  >([]);
  const [audioResponse, setAudioResponse] = useState<Blob | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);

  const handleTranscriptReceived = (text: string, speaker: "AI" | "Human") => {
    setTranscript((prev) => [...prev, { text, speaker }]);

    // Add message to chat history
    const newMessage: Message = {
      id: Date.now().toString(),
      role: speaker === "AI" ? "assistant" : "user",
      content: text,
    };
    setMessages((prev) => [...prev, newMessage]);
  };

  const handleAudioResponse = (audioBlob: Blob) => {
    setAudioResponse(audioBlob);
  };

  return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-6xl space-y-6">
        <motion.h1
          className="text-4xl font-bold text-center bg-gradient-to-r from-green-400 to-emerald-500 bg-clip-text text-transparent"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          Human vs AI: The Great Debate
        </motion.h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 bg-zinc-900/50 border-zinc-800 backdrop-blur-xl p-6 rounded-3xl">
            <div className="relative aspect-[16/9] mb-12">
              <SphereVisualizer isActive={false} />
              <div className="absolute inset-0 flex items-center justify-center">
                <WaveformVisualizer isActive={false} />
              </div>
            </div>

            <div className="space-y-4">
              <Debater
                onTranscriptReceived={handleTranscriptReceived}
                onAudioResponse={handleAudioResponse}
                messages={messages}
              />
            </div>
          </Card>

          <div className="space-y-6">
            <LiveTranscript
              transcript={transcript}
              audioResponse={audioResponse}
            />
            <AudiencePoll />
          </div>
        </div>
      </div>
    </main>
  );
}
