"use client";

import { Card } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Play, Pause, RefreshCw } from "lucide-react";

interface LiveTranscriptProps {
  transcript: Array<{
    text: string;
    speaker: "AI" | "Human";
    timestamp?: number;
  }>;
  isPlaying: boolean;
  onTogglePlayback: () => void;
  aiIsTyping?: boolean;
  // Add optional audio data props
  recentUserAudio?: string; // base64 encoded audio
  recentAIAudio?: string; // base64 encoded audio
}

export default function LiveTranscript({
  transcript,
  isPlaying,
  onTogglePlayback,
  aiIsTyping = false,
  recentUserAudio,
  recentAIAudio,
}: LiveTranscriptProps) {
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [conversationSummary, setConversationSummary] = useState<string>("");
  const [audioAnalysis, setAudioAnalysis] = useState<string>("");
  const [isLoadingSummary, setIsLoadingSummary] = useState<boolean>(false);
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState<boolean>(false);
  const lastProcessedLengthRef = useRef<number>(0);
  const [shouldShowSummary, setShouldShowSummary] = useState<boolean>(false);
  const [shouldShowAudioAnalysis, setShouldShowAudioAnalysis] =
    useState<boolean>(false);

  // Function to fetch conversation text summary
  const fetchConversationSummary = async () => {
    if (transcript.length < 2) return; // Need at least one exchange

    setIsLoadingSummary(true);
    try {
      const response = await fetch("/api/summary", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ transcript }),
      });

      if (!response.ok) throw new Error("Failed to fetch summary");

      const data = await response.json();
      setConversationSummary(data.summary);

      // Once we have a summary, we should show it
      if (data.summary) {
        setShouldShowSummary(true);
      }
    } catch (error) {
      console.error("Error fetching summary:", error);
    } finally {
      setIsLoadingSummary(false);
    }
  };

  // Function to fetch audio analysis if available
  const fetchAudioAnalysis = async () => {
    // Only proceed if we have at least one audio source
    if (!recentUserAudio && !recentAIAudio) return;

    setIsLoadingAnalysis(true);
    try {
      const response = await fetch("/api/audio-analysis", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userAudio: recentUserAudio,
          aiAudio: recentAIAudio,
          transcript: transcript.slice(-4), // Send recent transcript for context
        }),
      });

      if (!response.ok) throw new Error("Failed to analyze audio");

      const data = await response.json();
      setAudioAnalysis(data.analysis);

      // Show audio analysis section once we have results
      if (data.analysis) {
        setShouldShowAudioAnalysis(true);
      }
    } catch (error) {
      console.error("Error analyzing audio:", error);
    } finally {
      setIsLoadingAnalysis(false);
    }
  };

  // Auto-scroll when content updates
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [transcript, aiIsTyping, conversationSummary, audioAnalysis]);

  // Detect conversation updates and generate summaries
  useEffect(() => {
    // Don't update while AI is typing - wait for the complete response
    if (aiIsTyping) return;

    // Check if transcript has new content (length increased)
    if (transcript.length <= lastProcessedLengthRef.current) return;

    // Analyze transcript to check if we have at least one complete Human-AI pair
    let hasCompletePair = false;
    let i = 0;

    while (i < transcript.length - 1) {
      if (
        transcript[i].speaker === "Human" &&
        transcript[i + 1].speaker === "AI"
      ) {
        hasCompletePair = true;
        break;
      }
      i++;
    }

    // Only update if we have at least one complete exchange
    if (hasCompletePair) {
      // Update the processed length to current length
      lastProcessedLengthRef.current = transcript.length;

      // Generate new summaries
      fetchConversationSummary();
      fetchAudioAnalysis();

      console.log(
        "Generating new summaries for transcript length:",
        transcript.length
      );
    }
  }, [transcript, aiIsTyping]);

  return (
    <Card className="bg-zinc-900/50 border-zinc-800 backdrop-blur-xl p-4 rounded-3xl">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-zinc-300">
            Conversation Analysis
          </h2>
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={onTogglePlayback}
          className="size-8 rounded-full"
        >
          {isPlaying ? (
            <Pause className="w-5 h-5" />
          ) : (
            <Play className="w-5 h-5" />
          )}
        </Button>
      </div>

      <div
        ref={scrollAreaRef}
        className="h-[300px] overflow-y-auto pr-4 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-zinc-900"
      >
        {!shouldShowSummary && !shouldShowAudioAnalysis && !aiIsTyping ? (
          <p className="text-zinc-500 text-center italic">
            Conversation analysis will appear here...
          </p>
        ) : (
          <div className="space-y-4">
            <AnimatePresence>
              {/* Conversation Summary - only show after we have at least one summary */}
              {shouldShowSummary && (
                <motion.div
                  key="conversation-summary"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20"
                >
                  <div className="text-sm font-medium mb-1 flex items-center justify-between text-zinc-400">
                    <span>✨ Conversation Summary</span>
                    {isLoadingSummary ? (
                      <RefreshCw className="w-3 h-3 animate-spin text-purple-400" />
                    ) : (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5"
                        onClick={fetchConversationSummary}
                      >
                        <RefreshCw className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                  <p className="text-sm text-zinc-300 leading-relaxed">
                    {isLoadingSummary
                      ? "Generating summary..."
                      : conversationSummary}
                  </p>
                </motion.div>
              )}

              {/* Audio Analysis - only show if we have analysis results */}
              {shouldShowAudioAnalysis && (
                <motion.div
                  key="audio-analysis"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20"
                >
                  <div className="text-sm font-medium mb-1 flex items-center justify-between text-zinc-400">
                    <span>🎤 Audio Analysis</span>
                    {isLoadingAnalysis ? (
                      <RefreshCw className="w-3 h-3 animate-spin text-amber-400" />
                    ) : (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5"
                        onClick={fetchAudioAnalysis}
                      >
                        <RefreshCw className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                  <p className="text-sm text-zinc-300 leading-relaxed">
                    {isLoadingAnalysis ? "Analyzing audio..." : audioAnalysis}
                  </p>
                </motion.div>
              )}

              {/* AI analyzing indicator */}
              {aiIsTyping && (
                <motion.div
                  key="ai-analyzing"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20"
                >
                  <div className="text-sm font-medium mb-1 flex items-center gap-2 text-zinc-400">
                    🔍 Analyzing Conversation
                  </div>
                  <div className="flex space-x-2 items-center h-5">
                    <span
                      className="w-2 h-2 rounded-full bg-blue-500 animate-bounce"
                      style={{ animationDelay: "0ms" }}
                    ></span>
                    <span
                      className="w-2 h-2 rounded-full bg-blue-500 animate-bounce"
                      style={{ animationDelay: "200ms" }}
                    ></span>
                    <span
                      className="w-2 h-2 rounded-full bg-blue-500 animate-bounce"
                      style={{ animationDelay: "400ms" }}
                    ></span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </Card>
  );
}
