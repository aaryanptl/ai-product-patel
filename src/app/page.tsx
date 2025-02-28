"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { Message } from "ai";
import {
  Mic,
  RefreshCw,
  BarChart2,
  FileText,
  Maximize2,
  ChevronRight,
  Sparkles,
  Square,
} from "lucide-react";
import Debater from "@/components/debater";
import LiveTranscript from "@/components/live-transcript";
import AudiencePoll from "@/components/audience-poll";
import AudioVisualizer from "@/components/audio-visualizer";
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
  const [isPlaying, setIsPlaying] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [aiIsTyping, setAiIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const lastAudioUpdateTimeRef = useRef(0);
  const [currentDebateId, setCurrentDebateId] = useState<string | null>(null);

  // For the new UI
  const [activeTab, setActiveTab] = useState("summary");
  const [audioLevel, setAudioLevel] = useState(0);

  // Add state for storing recent audio data
  const [recentUserAudio, setRecentUserAudio] = useState<string>("");
  const [recentAIAudio, setRecentAIAudio] = useState<string>("");

  // Track last speaker for audio collection
  const lastSpeakerRef = useRef<"AI" | "Human" | null>(null);
  const lastTranscriptTimestampRef = useRef(0);

  // Buffer for collecting audio chunks
  const userAudioBufferRef = useRef<Blob[]>([]);
  const aiAudioBufferRef = useRef<Blob[]>([]);

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
          return newDebate.id;
        }
      } catch (error) {
        console.error("Error initializing debate:", error);
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

        // Only update audio data if there's actual audio content or if AI is typing
        if (uint8Array.some((val) => val > 0) || aiIsTyping) {
          setAudioData(uint8Array);
          // Set audio level for visualization (simplified calculation)
          const sum = uint8Array.reduce((acc, val) => acc + val, 0);
          const avg = sum / uint8Array.length / 255;

          // Ensure minimum level while AI is active and smooth transitions
          const level = aiIsTyping ? Math.max(0.2, avg) : avg;
          setAudioLevel(level);
          setIsPlaying(true);
        } else if (!aiIsTyping) {
          // Only clear visualization if AI is not typing, with a small delay
          setTimeout(() => {
            setAudioData(undefined);
            setAudioLevel(0);
            setIsPlaying(false);
          }, 100);
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
    [aiIsTyping]
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

  // Sync isListening with Debater's isSessionActive state
  useEffect(() => {
    // When the debater component updates its session state, it will
    // apply a different class to the mic button which we can detect
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (
          mutation.target.nodeName === "BUTTON" &&
          (mutation.target as HTMLElement).classList.contains(
            "debater-mic-button"
          )
        ) {
          const isActive = (mutation.target as HTMLElement).classList.contains(
            "border-red-500"
          );
          setIsListening(isActive);
        }
      });
    });

    // Start observing the document with the configured parameters
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["class"],
      subtree: true,
    });

    return () => observer.disconnect();
  }, []);

  // Handle AI typing state changes
  const handleAiTypingChange = useCallback((isTyping: boolean) => {
    setAiIsTyping(isTyping);
  }, []);

  // Reset audio data when AI stops speaking to hide the visualizer
  useEffect(() => {
    if (!aiIsTyping) {
      // Add a delay before clearing the visualization
      const timer = setTimeout(() => {
        setAudioData(undefined);
        setIsPlaying(false);
        setAudioLevel(0);
      }, 1000); // 1 second delay to match other timeouts

      return () => clearTimeout(timer);
    }
  }, [aiIsTyping]);

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

  return (
    <div className="min-h-screen bg-[#0a1017] text-white">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <header className="mb-8">
          <motion.h1
            className="text-4xl md:text-5xl font-bold text-center bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-teal-500"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            Meet Product Patel
          </motion.h1>
          <motion.p
            className="text-center text-gray-400 mt-2 max-w-2xl mx-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            The AI Product Manager at Build Fast with AI
          </motion.p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content Area */}
          <div className="lg:col-span-2">
            <motion.div
              className="relative bg-[#111827] rounded-2xl border border-gray-800 shadow-xl overflow-hidden h-[600px] flex flex-col items-center justify-center"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
            >
              {/* Audio Visualizer Container */}
              <div className="absolute inset-0 flex flex-col items-center justify-between py-10">
                {/* Audio Visualization in the Middle */}
                <div className="flex-1 w-full flex items-center justify-center overflow-hidden">
                  <div className="w-full h-full pointer-events-none flex items-center justify-center">
                    <AudioVisualizer
                      isActive={
                        !!audioData && isPlaying && (isListening || aiIsTyping)
                      }
                      audioData={audioData}
                      isProcessing={isProcessing}
                      isGenerating={aiIsTyping}
                    />
                  </div>
                </div>

                {/* Mic Button at the Bottom */}
                <div className="relative flex flex-col items-center mb-6">
                  {/* Fixed Microphone Button */}
                  <motion.button
                    className={`size-20 rounded-full flex items-center justify-center transition-all ${
                      isListening
                        ? "bg-red-500 shadow-lg shadow-red-500/30"
                        : "bg-teal-500 shadow-lg shadow-teal-500/30"
                    }`}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      setIsListening(!isListening);
                      // This should trigger the debater's handleStartStopClick
                      const micButton = document.querySelector(
                        ".debater-mic-button"
                      );
                      if (micButton) {
                        (micButton as HTMLButtonElement).click();
                      }
                    }}
                  >
                    {isListening ? (
                      <Square className="size-8 text-white animate-pulse" />
                    ) : (
                      <Mic className="size-8 text-white" />
                    )}
                  </motion.button>

                  {/* Status Message */}
                  <div className="text-sm text-gray-400 mt-3">
                    {isProcessing
                      ? "Processing..."
                      : isListening
                      ? "Listening..."
                      : "Tap microphone to speak"}
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
                />
              </div>
            </motion.div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Analysis Panel */}
            <motion.div
              className="bg-gray-900 rounded-xl border border-gray-800 shadow-lg overflow-hidden"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <div className="p-4 border-b border-gray-800 flex justify-between items-center">
                <h2 className="font-semibold text-white flex items-center">
                  <BarChart2 className="w-5 h-5 mr-2 text-teal-500" />
                  Debate Transcript
                </h2>
                <button className="text-gray-400 hover:text-white transition-colors">
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>

              <div className="p-4 border border-gray-700/50">
                <div className="flex items-start gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-amber-400 mt-0.5" />
                </div>
                <p className="text-sm text-gray-300">
                  {transcript.length > 0
                    ? "The AI has stated it does not have a name and prefers to be seen as a helpful AI companion. The current topic is the AI's lack of a personal name."
                    : "Start a conversation to see a summary here."}
                </p>
              </div>
            </motion.div>

            {/* Audience Poll */}
            <motion.div
              className="bg-gray-900 rounded-xl border border-gray-800 shadow-lg overflow-hidden"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              {currentDebateId ? (
                <AudiencePoll debateId={currentDebateId} />
              ) : (
                <div className="p-4">
                  <h2 className="text-lg text-white font-semibold">
                    Loading debate...
                  </h2>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
