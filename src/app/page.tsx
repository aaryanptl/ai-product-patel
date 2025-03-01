"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Message } from "ai";
import {
  Mic,
  RefreshCw,
  BarChart3,
  Share2,
  Square,
  Brain,
  Wand2,
  Activity,
  ExternalLink,
  Zap,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Debater from "@/components/debater";
import AudiencePoll from "@/components/audience-poll";
import { createClient } from "@supabase/supabase-js";
import { Database } from "@/types/supabase";

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

export default function Home() {
  const [transcript, setTranscript] = useState<
    Array<{ text: string; speaker: "AI" | "Human"; timestamp?: number }>
  >([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [audioData, setAudioData] = useState<Uint8Array | undefined>();
  const [isProcessing, setIsProcessing] = useState(false);
  const [aiIsTyping, setAiIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [currentDebateId, setCurrentDebateId] = useState<string | null>(null);
  const [isDebateLoading, setIsDebateLoading] = useState(true);
  const [audioLevel, setAudioLevel] = useState(0);
  const [recentUserAudio, setRecentUserAudio] = useState<string>("");
  const [recentAIAudio, setRecentAIAudio] = useState<string>("");
  const [brainActivity, setBrainActivity] = useState(Array(12).fill(0));
  const [isPlaying, setIsPlaying] = useState(false);
  const [sessionStatus, setSessionStatus] = useState<string>("");

  // References for audio handling
  const lastAudioUpdateTimeRef = useRef(0);
  const lastSpeakerRef = useRef<"AI" | "Human" | null>(null);
  const lastTranscriptTimestampRef = useRef(0);
  const userAudioBufferRef = useRef<Blob[]>([]);
  const aiAudioBufferRef = useRef<Blob[]>([]);

  // Effect to animate audio bars when audio is playing
  useEffect(() => {
    let animationInterval: NodeJS.Timeout | null = null;

    if (isAudioPlaying) {
      // Update the visualizer every 100ms to create animation
      animationInterval = setInterval(() => {
        // Force re-render to get new random heights
        setAudioLevel((prev) => (prev > 0.5 ? 0.3 : 0.7));
      }, 100);
    }

    return () => {
      if (animationInterval) {
        clearInterval(animationInterval);
      }
    };
  }, [isAudioPlaying]);

  // Simulate brain activity for the visualization
  useEffect(() => {
    const interval = setInterval(() => {
      setBrainActivity((prev) => prev.map(() => Math.random() * 100));
    }, 800);

    return () => clearInterval(interval);
  }, []);

  // Create or get active debate
  useEffect(() => {
    const initializeDebate = async () => {
      try {
        // Check for active debate
        const { data: existingDebate, error } = await supabase
          .from("rt_debates")
          .select("id, title")
          .eq("is_active", true)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (!error && existingDebate) {
          console.log("Found existing debate:", existingDebate);
          setCurrentDebateId(existingDebate.id);
          setIsDebateLoading(false);
          return existingDebate.id;
        } else {
          console.log("No active debate found, creating new one");
          // Create a new debate
          const { data: newDebate, error: createError } = await supabase
            .from("rt_debates")
            .insert({
              title: "Human vs AI: The Great Debate",
              description:
                "Live debate between human intelligence and artificial intelligence",
              is_active: true,
            })
            .select()
            .single();

          if (createError) {
            console.error("Error creating debate:", createError);
            throw createError;
          }

          console.log("Created new debate:", newDebate);
          setCurrentDebateId(newDebate.id);
          setIsDebateLoading(false);
          return newDebate.id;
        }
      } catch (error) {
        console.error("Error initializing debate:", error);
        setIsDebateLoading(false);
        return null;
      }
    };

    // Initialize the debate
    initializeDebate();
  }, []);

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

  // Modified function to handle audio response and collect audio data
  const handleAudioResponse = useCallback(
    async (audioBlob: Blob) => {
      if (audioBlob.size === 0) {
        // When we receive an empty blob, clear with a small delay
        setTimeout(() => {
          setAudioData(undefined);
          setIsPlaying(false);
          setAudioLevel(0);
          // Also clear the audio buffers
          userAudioBufferRef.current = [];
          aiAudioBufferRef.current = [];
        }, 100); // Small delay to ensure smooth transition
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

        // Only update visualization if audio is actually playing or a clear signal is sent
        if (hasAudioContent && isAudioPlaying) {
          setAudioData(uint8Array);
          // Set audio level for visualization (simplified calculation)
          const sum = uint8Array.reduce((acc, val) => acc + val, 0);
          const avg = sum / uint8Array.length / 255;
          setAudioLevel(avg);
          setIsPlaying(true);
        } else if (!isAudioPlaying) {
          // When audio is not playing, always clear visualization
          setAudioData(undefined);
          setAudioLevel(0);
          setIsPlaying(false);
        }

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
    [isAudioPlaying]
  );

  // Function to process collected audio buffer and convert to base64
  const processAudioBuffer = useCallback((speaker: "AI" | "Human") => {
    if (speaker === "Human" && userAudioBufferRef.current.length > 0) {
      const blob = new Blob(userAudioBufferRef.current, { type: "audio/mp3" });
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
  }, []);

  // Handle AI typing state changes
  const handleAiTypingChange = useCallback((isTyping: boolean) => {
    setAiIsTyping(isTyping);
  }, []);

  // Add handler for audio playing state changes
  const handleAudioPlayingChange = useCallback((isPlaying: boolean) => {
    console.log(
      `🔊 [Page] Audio playing state changed to: ${
        isPlaying ? "PLAYING" : "STOPPED"
      }`
    );

    // Immediately update the playing state so UI can react
    setIsAudioPlaying(isPlaying);

    // When audio starts, ensure we have some initial level
    if (isPlaying) {
      setAudioLevel(0.7); // Set an initial level for better visual feedback
    }
    // When audio stops playing, ensure we clean up immediately
    else {
      console.log("🔄 [Page] Audio stopped, resetting audio data");
      // Reset audio data immediately for UI
      setAudioData(undefined);
      setAudioLevel(0);
      setIsPlaying(false);
    }
  }, []);

  // New handler for session status changes
  const handleSessionStatusChange = useCallback((status: string) => {
    console.log(`🔄 [Page] Session status changed to: ${status}`);
    setSessionStatus(status);
  }, []);

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Animated background */}
      <div className="fixed inset-0 z-0 opacity-20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.15),transparent_70%)]" />
        <div className="absolute top-0 w-full h-px bg-gradient-to-r from-transparent via-emerald-500 to-transparent" />
        <div className="absolute bottom-0 w-full h-px bg-gradient-to-r from-transparent via-emerald-500 to-transparent" />
        <div className="absolute left-0 h-full w-px bg-gradient-to-b from-transparent via-emerald-500 to-transparent" />
        <div className="absolute right-0 h-full w-px bg-gradient-to-b from-transparent via-emerald-500 to-transparent" />
      </div>

      {/* Header */}
      <header className="relative z-10 pt-8 pb-4 text-center">
        <div className="flex items-center justify-center gap-2 mb-1">
          <Zap className="w-8 h-8 text-emerald-400" />
          <h1 className="text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400">
            NEXUS
          </h1>
          <Zap className="w-8 h-8 text-emerald-400" />
        </div>
        <p className="text-emerald-400/80 text-lg tracking-widest uppercase">
          Advanced Debate Intelligence
        </p>
      </header>

      <div className="flex-1 relative z-10 flex flex-col md:flex-row gap-6 p-6">
        {/* Main AI visualization */}
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
                        opacity: isAudioPlaying
                          ? 0.5 + Math.random() * 0.5
                          : 0.3,
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

          {/* Session Status Display */}
          {isProcessing && (
            <div className="mx-8 mb-4 p-3 bg-black/60 border border-emerald-500/30 rounded-lg">
              <div className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 text-emerald-400 animate-spin" />
                <p className="text-emerald-400 text-sm font-medium">
                  {sessionStatus}
                </p>
              </div>
            </div>
          )}

          {/* Microphone control */}
          <div className="p-8 flex justify-center">
            <div className="relative">
              <button
                onClick={() => {
                  if (isDebateLoading || !currentDebateId || isProcessing)
                    return;

                  setIsListening(!isListening);
                  // This should trigger the debater's handleStartStopClick
                  const micButton = document.querySelector(
                    ".debater-mic-button"
                  );
                  if (micButton) {
                    (micButton as HTMLButtonElement).click();
                  }
                }}
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

              {/* Pulse effect */}
              <div
                className={`absolute inset-0 rounded-full bg-emerald-400/20 transition-all duration-300 ${
                  isListening ? "animate-ping" : "opacity-0"
                }`}
              />

              {/* Audio level indicator */}
              <div className="absolute -inset-3 rounded-full border border-emerald-400/30" />
              <svg className="absolute -inset-3 w-[calc(100%+24px)] h-[calc(100%+24px)]">
                <circle
                  cx="50%"
                  cy="50%"
                  r="calc(50% - 1px)"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="text-emerald-400"
                  strokeDasharray={`${audioLevel * 188} 188`}
                  strokeDashoffset="0"
                  transform="rotate(-90, 50%, 50%)"
                />
              </svg>
            </div>
          </div>

          <div className="px-8 pb-6 text-center text-emerald-400/80 font-light tracking-wider">
            {isDebateLoading
              ? "INITIALIZING SESSION..."
              : isProcessing
              ? sessionStatus
              : isListening
              ? "LISTENING..."
              : "TAP TO SPEAK"}
          </div>
        </div>

        {/* Right sidebar */}
        <div className="md:w-96 space-y-6">
          {/* Neural Analysis Panel */}
          <div className="border border-emerald-500/30 rounded-2xl bg-black/40 backdrop-blur-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-emerald-400" />
                <h2 className="text-lg font-medium text-emerald-100">
                  Neural Analysis
                </h2>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="text-emerald-400 h-8 w-8"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>

            <div className="h-48 overflow-y-auto rounded-lg border border-emerald-500/20 bg-black/60 p-3 text-sm">
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <Brain className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                  <p className="text-emerald-100/80">
                    Analyzing argument structure...{" "}
                    <span className="text-emerald-400">Complete</span>
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <Wand2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                  <p className="text-emerald-100/80">
                    Generating counter-arguments based on historical debate
                    patterns...
                  </p>
                </div>
                <div className="flex items-start gap-2 opacity-60">
                  <BarChart3 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                  <p className="text-emerald-100/80">
                    Start a conversation to see real-time analysis.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Audience Consensus */}
          <div className="border border-emerald-500/30 rounded-2xl bg-black/40 backdrop-blur-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Share2 className="w-5 h-5 text-emerald-400" />
                <h2 className="text-lg font-medium text-emerald-100">
                  Audience Consensus
                </h2>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="text-emerald-400 h-8 w-8"
              >
                <Share2 className="h-4 w-4" />
              </Button>
            </div>

            {currentDebateId ? (
              <AudiencePoll debateId={currentDebateId} />
            ) : (
              <div className="space-y-4">
                <div className="text-center py-4 text-emerald-400/60">
                  Loading debate data...
                </div>
              </div>
            )}

            <Button
              variant="ghost"
              className="w-full text-xs text-emerald-400 gap-1 mt-2"
            >
              <ExternalLink className="h-3 w-3" />
              Open Voting Dashboard
            </Button>
          </div>
        </div>
      </div>

      {/* Hidden Debater Component */}
      <div className="opacity-0 pointer-events-none absolute">
        <Debater
          onTranscriptReceived={handleTranscriptReceived}
          onAudioResponse={handleAudioResponse}
          messages={messages}
          onProcessingChange={setIsProcessing}
          onAiTypingChange={handleAiTypingChange}
          onAudioPlayingChange={handleAudioPlayingChange}
          onSessionStatusChange={handleSessionStatusChange}
        />
      </div>

      {/* Footer */}
      <footer className="relative z-10 py-4 text-center text-emerald-400/60 text-xs">
        NEXUS v2.0 • Quantum Neural Processing • {new Date().getFullYear()}
      </footer>
    </div>
  );
}
