import { Message } from "ai";
import { useEffect, useRef, useState } from "react";
import { Button } from "./ui/button";
import { Loader2 } from "lucide-react";

interface ChatConversationProps {
  transcript: Array<{
    text: string;
    speaker: "AI" | "Human";
    timestamp?: number;
  }>;
  isDarkMode?: boolean;
  userAudio?: string; // base64 encoded audio
  onTranscribe?: (userAudio: string) => Promise<void>;
}

export default function ChatConversation({
  transcript,
  isDarkMode = false,
  userAudio,
  onTranscribe,
}: ChatConversationProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const previousAudioRef = useRef<string | undefined>(undefined);
  const [transcriptionError, setTranscriptionError] = useState<string | null>(
    null
  );

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript]);

  // Auto transcribe audio when it changes using Groq Whisper
  useEffect(() => {
    let isMounted = true;

    if (
      userAudio &&
      onTranscribe &&
      userAudio !== previousAudioRef.current &&
      !isTranscribing
    ) {
      const performTranscription = async () => {
        if (!isMounted) return;

        setIsTranscribing(true);
        setTranscriptionError(null);

        try {
          console.log("Auto-transcribing audio with Groq Whisper...");
          await onTranscribe(userAudio);
          if (isMounted) {
            // Store the current audio as previous after successful transcription
            previousAudioRef.current = userAudio;
          }
        } catch (error) {
          console.error("Auto-transcription with Groq Whisper failed:", error);
          if (isMounted) {
            setTranscriptionError(
              (error as Error).message || "Transcription failed"
            );
          }
        } finally {
          if (isMounted) {
            setIsTranscribing(false);
          }
        }
      };

      performTranscription();
    }

    return () => {
      isMounted = false;
    };
  }, [userAudio, onTranscribe, isTranscribing]);

  // Handle manual transcribe button click (kept as fallback)
  const handleTranscribe = async () => {
    if (!userAudio || !onTranscribe) return;

    setIsTranscribing(true);
    setTranscriptionError(null);

    try {
      console.log("Manually transcribing audio with Groq Whisper...");
      await onTranscribe(userAudio);
      // Update previous audio reference
      previousAudioRef.current = userAudio;
    } catch (error) {
      console.error("Manual transcription with Groq Whisper failed:", error);
      setTranscriptionError((error as Error).message || "Transcription failed");
    } finally {
      setIsTranscribing(false);
    }
  };

  return (
    <div
      className={`rounded-2xl max-w-[350px] w-full flex flex-col h-full shadow-lg overflow-hidden transition-all duration-300 ${
        isDarkMode
          ? "bg-gray-800 border border-emerald-500/30 shadow-emerald-900/20"
          : "bg-white border border-gray-200 shadow-gray-200/60"
      }`}
    >
      <div
        className={`p-4 flex justify-between items-center ${
          isDarkMode
            ? "border-b border-emerald-500/30"
            : "border-b border-gray-200"
        }`}
      >
        <h2
          className={`font-semibold ${
            isDarkMode ? "text-emerald-100" : "text-gray-800"
          }`}
        >
          Conversation
        </h2>
      </div>

      <div className="flex-1 p-4 space-y-4 overflow-y-auto max-h-[calc(100vh-10rem)]">
        {transcript.map((message, index) => (
          <div
            key={`${message.speaker}-${message.timestamp || index}`}
            className={`flex ${
              message.speaker === "Human" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-[80%] rounded-lg text-sm font-medium p-3 ${
                message.speaker === "Human"
                  ? isDarkMode
                    ? "bg-emerald-600 text-white"
                    : "bg-emerald-500 text-white"
                  : isDarkMode
                  ? "bg-gray-700 text-gray-100"
                  : "bg-gray-100 text-gray-800"
              }`}
            >
              {message.text}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}
