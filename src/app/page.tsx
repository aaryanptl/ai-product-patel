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
import Image from "next/image";
import Link from "next/link";
import AudioPulseIndicator from "@/components/AudioPulseIndicator";
import { customInstructions } from "@/lib/data";

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
  const [debateSummary, setDebateSummary] = useState<string>(
    "Hello! I am Product Patel, AI Product Manager at Build Fast with AI. I'm here at IIM Bangalore to demonstrate a simple truth: AI product management is not just the future, it is the present, because it is *better* than human product management."
  );
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);
  const [audioAnalysis, setAudioAnalysis] = useState<string>("");
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [aiInstructions, setAiInstructions] =
    useState<string>(customInstructions);

  // References for audio handling
  const lastAudioUpdateTimeRef = useRef(0);
  const lastSpeakerRef = useRef<"AI" | "Human" | null>(null);
  const lastTranscriptTimestampRef = useRef(0);
  const userAudioBufferRef = useRef<Blob[]>([]);
  const aiAudioBufferRef = useRef<Blob[]>([]);

  // Effect to animate audio bars when audio is playing
  useEffect(() => {
    let animationInterval: NodeJS.Timeout | null = null;

    if (isAudioPlaying && isListening) {
      // Update the visualizer every 100ms to create animation
      animationInterval = setInterval(() => {
        // Force re-render to get new random heights
        setAudioLevel((prev) => (prev > 0.5 ? 0.3 : 0.7));
      }, 100);
    } else {
      // Ensure animation stops and level is reset when not active
      setAudioLevel(0);
    }

    return () => {
      if (animationInterval) {
        clearInterval(animationInterval);
      }
    };
  }, [isAudioPlaying, isListening]);

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
          setCurrentDebateId(existingDebate.id);
          setIsDebateLoading(false);
          return existingDebate.id;
        } else {
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
      if (audioBlob.size === 0 || !isListening) {
        // When we receive an empty blob or listening is off, clear immediately
        setAudioData(undefined);
        setIsPlaying(false);
        setAudioLevel(0);
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

        // Only update visualization if audio is actually playing or a clear signal is sent
        if (hasAudioContent && isAudioPlaying && isListening) {
          setAudioData(uint8Array);
          // Set audio level for visualization (simplified calculation)
          const sum = uint8Array.reduce((acc, val) => acc + val, 0);
          const avg = sum / uint8Array.length / 255;
          setAudioLevel(avg);
          setIsPlaying(true);
        } else if (!isAudioPlaying || !isListening) {
          // When audio is not playing or listening is off, always clear visualization
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
    [isAudioPlaying, isListening]
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
  const handleAudioPlayingChange = useCallback(
    (isPlaying: boolean) => {
      console.log(
        `🔊 [Page] Audio playing state changed to: ${
          isPlaying ? "PLAYING" : "STOPPED"
        }`
      );

      // Only update audio playing state if we're still listening
      if (isListening) {
        // Immediately update the playing state so UI can react
        setIsAudioPlaying(isPlaying);

        // When audio starts, ensure we have some initial level
        if (isPlaying) {
          setAudioLevel(0.7); // Set an initial level for better visual feedback
        }
      }
      // When audio stops playing or not listening, ensure we clean up immediately
      else {
        console.log(
          "🔄 [Page] Audio stopped or not listening, resetting audio data"
        );
        // Reset audio data immediately for UI
        setIsAudioPlaying(false);
        setAudioData(undefined);
        setAudioLevel(0);
        setIsPlaying(false);
      }
    },
    [isListening]
  );

  // New handler for session status changes
  const handleSessionStatusChange = useCallback((status: string) => {
    console.log(`🔄 [Page] Session status changed to: ${status}`);
    setSessionStatus(status);
  }, []);

  // Effect to fetch a summary whenever the transcript changes with new AI messages
  useEffect(() => {
    const fetchDebateSummary = async () => {
      // Only generate a summary if we have at least 2 messages (1 exchange)
      if (transcript.length < 2) return;

      // Check if the last message is from AI and is final (not being typed)
      const lastMessage = transcript[transcript.length - 1];
      if (lastMessage.speaker !== "AI" || aiIsTyping) return;

      // Don't update while audio is still playing
      if (isAudioPlaying) return;

      // Add a small delay after audio stops to ensure everything is processed
      const timeoutId = setTimeout(() => {
        // Only show loading indicator if we don't have a summary yet
        const shouldShowLoading = !debateSummary.trim();

        if (shouldShowLoading) {
          setIsLoadingSummary(true);
        } else {
          // Start transition animation if we already have text
          setIsTransitioning(true);
        }

        try {
          fetch("/api/summary", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ transcript }),
          })
            .then((response) => {
              if (!response.ok) throw new Error("Failed to fetch summary");
              return response.json();
            })
            .then((data) => {
              setDebateSummary(data.summary);
              setIsLoadingSummary(false);

              // End transition after a short delay
              setTimeout(() => {
                setIsTransitioning(false);
              }, 300);
            })
            .catch((error) => {
              console.error("Error fetching debate summary:", error);
              setIsLoadingSummary(false);
              setIsTransitioning(false);
            });
        } catch (error) {
          console.error("Error initiating debate summary fetch:", error);
          setIsLoadingSummary(false);
          setIsTransitioning(false);
        }
      }, 1500); // 1.5 second delay after audio stops playing

      return () => clearTimeout(timeoutId);
    };

    fetchDebateSummary();
  }, [transcript, aiIsTyping, isAudioPlaying, debateSummary]);

  // Effect to fetch audio analysis when new audio is available
  useEffect(() => {
    const fetchAudioAnalysis = async () => {
      // Only proceed if we have at least one audio source and at least 2 messages
      if ((!recentUserAudio && !recentAIAudio) || transcript.length < 2) return;

      // Check if the last message is from AI (meaning an exchange just completed)
      const lastMessage = transcript[transcript.length - 1];
      if (lastMessage.speaker !== "AI") return;

      // Don't update while audio is still playing
      if (isAudioPlaying) return;

      // Add a small delay after audio stops to ensure everything is processed
      const timeoutId = setTimeout(() => {
        setIsLoadingAnalysis(true);
        try {
          fetch("/api/audio-analysis", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              userAudio: recentUserAudio,
              aiAudio: recentAIAudio,
              transcript: transcript.slice(-4), // Send recent transcript for context
            }),
          })
            .then((response) => {
              if (!response.ok) throw new Error("Failed to analyze audio");
              return response.json();
            })
            .then((data) => {
              setAudioAnalysis(data.analysis);
              setIsLoadingAnalysis(false);
            })
            .catch((error) => {
              console.error("Error analyzing audio:", error);
              setIsLoadingAnalysis(false);
            });
        } catch (error) {
          console.error("Error initiating audio analysis:", error);
          setIsLoadingAnalysis(false);
        }
      }, 1500); // 1.5 second delay after audio stops playing

      return () => clearTimeout(timeoutId);
    };

    fetchAudioAnalysis();
  }, [recentUserAudio, recentAIAudio, transcript, isAudioPlaying]);

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
      <header className="relative z-10 pt-8 pb-4 text-center items-center">
        <Link href="https://buildfastwithai.com">
          <Image
            src="/logo.svg"
            alt="Build Fast with AI"
            width={70}
            height={70}
            className="absolute left-10"
          />
        </Link>
        <div className="flex items-center justify-center gap-2 mb-1">
          <Zap className="w-8 h-8 text-emerald-400" />
          <h1 className="text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400">
            MEET PRODUCT PATEL
          </h1>
          <Zap className="w-8 h-8 text-emerald-400" />
        </div>
        <p className="text-emerald-400/80 text-lg tracking-widest uppercase">
          The AI Product Manager at Build Fast with AI
        </p>
      </header>

      <div className="flex-1 relative z-10 flex flex-col md:flex-row gap-6 p-6 container w-full mx-auto">
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

          {/* Microphone control */}
          <div className="p-8 flex justify-center">
            <div className="relative">
              <button
                onClick={() => {
                  if (isDebateLoading || !currentDebateId || isProcessing)
                    return;

                  // Stop all audio animations when toggling off the microphone
                  if (isListening) {
                    // Immediately stop all audio animations
                    setIsAudioPlaying(false);
                    setAudioLevel(0);
                    setIsPlaying(false);
                    setAudioData(undefined);

                    // Make sure any ongoing effects are cleared
                    const resetAnimations = () => {
                      setIsAudioPlaying(false);
                      setAudioLevel(0);
                      setIsPlaying(false);
                      setAudioData(undefined);
                    };

                    // Double cleanup with small delay to ensure everything is reset
                    resetAnimations();
                    setTimeout(resetAnimations, 50);
                  }

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

              {/* Replace pulse and audio indicators with new component */}
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
                  onClick={() => {
                    setIsListening(false);
                    setSessionStatus("");
                    // Trigger retry by toggling the debater's mic button
                    const micButton = document.querySelector(
                      ".debater-mic-button"
                    );
                    if (micButton) {
                      (micButton as HTMLButtonElement).click();
                    }
                  }}
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

        {/* Right sidebar */}
        <div className="md:w-96 space-y-6">
          {/* Neural Analysis Panel */}
          <div className="border border-emerald-500/30 rounded-2xl bg-black/40 backdrop-blur-sm overflow-hidden">
            <div className="p-4 border-b border-emerald-500/30 flex justify-between items-center">
              <h2 className="font-semibold text-emerald-100 flex items-center">
                <Activity className="w-5 h-5 mr-2 text-emerald-400" />
                Debate Transcript
              </h2>
              <Button
                variant="ghost"
                size="icon"
                className="text-emerald-400 h-8 w-8"
                onClick={async () => {
                  if (transcript.length < 2) return;

                  // Don't update while audio is still playing
                  if (isAudioPlaying) {
                    // Provide visual feedback that we're waiting for audio to complete
                    setSessionStatus("Waiting for audio to complete...");
                    setTimeout(() => setSessionStatus(""), 2000);
                    return;
                  }

                  // Only show loading indicator if we don't have a summary yet
                  const shouldShowLoading = !debateSummary.trim();

                  if (shouldShowLoading) {
                    setIsLoadingSummary(true);
                  } else {
                    // Start transition animation if we already have text
                    setIsTransitioning(true);
                  }

                  try {
                    const response = await fetch("/api/summary", {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                      },
                      body: JSON.stringify({ transcript }),
                    });

                    if (!response.ok)
                      throw new Error("Failed to fetch summary");

                    const data = await response.json();
                    setDebateSummary(data.summary);
                    setIsLoadingSummary(false);

                    // End transition after a short delay
                    setTimeout(() => {
                      setIsTransitioning(false);
                    }, 300);
                  } catch (error) {
                    console.error("Error fetching debate summary:", error);
                    setIsLoadingSummary(false);
                    setIsTransitioning(false);
                  }
                }}
              >
                {isLoadingSummary ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
              </Button>
            </div>

            <div className="p-4 space-y-4 max-h-80 overflow-y-auto">
              {/* Debate Summary */}
              <div>
                <div className="p-3 rounded-lg bg-emerald-900/20 border border-emerald-500/20">
                  <p
                    className={`text-sm text-emerald-100/80 transition-opacity duration-300 ${
                      isTransitioning ? "opacity-30" : "opacity-100"
                    }`}
                  >
                    {isLoadingSummary && !debateSummary ? (
                      <span className="flex items-center">
                        <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                        Generating summary...
                      </span>
                    ) : (
                      debateSummary
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Instructions Panel */}
          <div className="border border-emerald-500/30 rounded-2xl bg-black/40 backdrop-blur-sm overflow-hidden">
            <div className="p-4 border-b border-emerald-500/30">
              <h2 className="font-semibold text-emerald-100 flex items-center">
                <Wand2 className="w-5 h-5 mr-2 text-emerald-400" />
                AI Instructions
              </h2>
            </div>
            <div className="p-4">
              <textarea
                value={aiInstructions}
                onChange={(e) => setAiInstructions(e.target.value)}
                className="w-full h-48 bg-black/60 border border-emerald-500/30 rounded-lg p-3 text-emerald-100 text-sm font-mono resize-none focus:outline-none focus:border-emerald-400"
                placeholder="Enter custom instructions for the AI..."
              />
              <Button
                onClick={() => {
                  // Just update the instructions, don't trigger mic button
                  setSessionStatus(
                    "Instructions updated. Click the mic button to start speaking."
                  );
                  setTimeout(() => setSessionStatus(""), 2000);
                }}
                className="mt-3 w-full bg-emerald-600 hover:bg-emerald-700"
              >
                Apply Instructions
              </Button>
            </div>
          </div>

          {/* Audience Consensus */}
          <AudiencePoll debateId={currentDebateId!} />
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
          customInstructions={aiInstructions}
        />
      </div>

      {/* Footer */}
      <footer className="relative z-10 py-4 text-center text-emerald-400/60 text-xs">
        powered by{" "}
        <Link href="https://buildfastwithai.com">Build Fast with AI</Link> •{" "}
        {new Date().getFullYear()}
      </footer>
    </div>
  );
}
