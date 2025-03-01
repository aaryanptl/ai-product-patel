"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Share2, ExternalLink } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  createClient,
  RealtimePostgresChangesPayload,
} from "@supabase/supabase-js";
import { Database, RealtimeVotePayload } from "@/types/supabase";

// Initialize Supabase client (will be configured with environment variables)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

// Define vote type
interface Vote {
  vote_for: "human" | "ai";
  [key: string]: any;
}

export default function AudiencePoll({ debateId = "current" }) {
  const router = useRouter();
  const [votes, setVotes] = useState({ human: 0, ai: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [shareUrl, setShareUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [lastVote, setLastVote] = useState<"human" | "ai" | null>(null);
  const [showVoteFeedback, setShowVoteFeedback] = useState(false);
  const [currentDebateId, setCurrentDebateId] = useState<string>(
    typeof debateId === "string" ? debateId : ""
  );

  const totalVotes = votes.human + votes.ai;
  const getPercentage = (value: number) =>
    totalVotes === 0 ? 0 : (value / totalVotes) * 100;

  // Function to fetch vote counts
  const fetchVoteCounts = async (debateIdToUse: string) => {
    if (!debateIdToUse) {
      console.error("No debate ID provided for fetching votes");
      return;
    }

    try {
      // Get vote counts - use count aggregation correctly
      const { count: humanCount, error: humanError } = await supabase
        .from("rt_votes")
        .select("*", { count: "exact", head: true })
        .eq("debate_id", debateIdToUse)
        .eq("vote_for", "human");

      const { count: aiCount, error: aiError } = await supabase
        .from("rt_votes")
        .select("*", { count: "exact", head: true })
        .eq("debate_id", debateIdToUse)
        .eq("vote_for", "ai");

      if (humanError) throw humanError;
      if (aiError) throw aiError;

      setVotes({
        human: humanCount || 0,
        ai: aiCount || 0,
      });

      console.log(
        `Fetched votes: human=${humanCount}, ai=${aiCount} for debate ${debateIdToUse}`
      );
    } catch (error) {
      console.error("Error fetching votes:", error);
    }
  };

  // Load votes from Supabase
  useEffect(() => {
    const fetchVotes = async () => {
      try {
        // First get the current debate ID if not already provided
        let debateIdToUse = currentDebateId;

        if (!debateIdToUse || debateIdToUse === "current") {
          const { data, error } = await supabase
            .from("rt_debates")
            .select("id")
            .eq("is_active", true)
            .order("created_at", { ascending: false })
            .limit(1)
            .single();

          if (error) throw error;
          debateIdToUse = data?.id || "";
          setCurrentDebateId(debateIdToUse);
        }

        if (!debateIdToUse) {
          console.error("No debate ID found");
          setIsLoading(false);
          return;
        }

        // Set the share URL
        setShareUrl(`${window.location.origin}/vote/${debateIdToUse}`);

        // Fetch initial vote counts
        await fetchVoteCounts(debateIdToUse);
      } catch (error) {
        console.error("Error fetching initial data:", error);
        setVotes({ human: 0, ai: 0 });
      } finally {
        setIsLoading(false);
      }
    };

    fetchVotes();

    // Set up real-time subscription for votes
    const setupRealtime = async () => {
      let debateIdToUse = currentDebateId;

      if (!debateIdToUse || debateIdToUse === "current") {
        try {
          const { data, error } = await supabase
            .from("rt_debates")
            .select("id")
            .eq("is_active", true)
            .order("created_at", { ascending: false })
            .limit(1)
            .single();

          if (!error && data) {
            debateIdToUse = data.id;
            setCurrentDebateId(debateIdToUse);
          }
        } catch (error) {
          console.error("Error getting debate ID for realtime:", error);
          return;
        }
      }

      if (!debateIdToUse) return;

      // Set up interval to refetch votes every 10 seconds to ensure data is synchronized
      const intervalId = setInterval(() => {
        fetchVoteCounts(debateIdToUse);
      }, 10000);

      // Subscribe to real-time updates on the votes table
      const votesSubscription = supabase
        .channel(`votes-channel-${debateIdToUse}`)
        .on(
          "postgres_changes",
          {
            event: "*", // Listen for all events (INSERT, UPDATE, DELETE)
            schema: "public",
            table: "rt_votes",
            filter: `debate_id=eq.${debateIdToUse}`,
          },
          (payload) => {
            console.log("Vote change detected:", payload);

            // Refetch all votes to ensure counts are accurate
            fetchVoteCounts(debateIdToUse);
          }
        )
        .subscribe((status) => {
          console.log(`Realtime subscription status: ${status}`);
          if (status !== "SUBSCRIBED") {
            // If subscription fails, rely on interval refetching
            console.warn(
              "Realtime subscription not active, using interval fallback"
            );
          }
        });

      return { votesSubscription, intervalId };
    };

    const subscription = setupRealtime();

    // Cleanup function
    return () => {
      if (subscription) {
        subscription
          .then((result) => {
            if (result) {
              const { votesSubscription, intervalId } = result;
              if (votesSubscription) supabase.removeChannel(votesSubscription);
              if (intervalId) clearInterval(intervalId);
            }
          })
          .catch((err) => console.error("Error cleaning up:", err));
      }
    };
  }, [debateId]);

  const handleShareLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleVoteClick = async (voteFor: "human" | "ai") => {
    if (!currentDebateId) return;

    try {
      // Submit vote directly to Supabase
      const { error } = await supabase.from("rt_votes").insert({
        debate_id: currentDebateId,
        vote_for: voteFor,
        created_at: new Date().toISOString(),
      });

      if (error) throw error;

      // Optimistically update the UI
      setVotes((prev) => ({
        ...prev,
        [voteFor]: prev[voteFor] + 1,
      }));

      // Show vote feedback
      setLastVote(voteFor);
      setShowVoteFeedback(true);
      setTimeout(() => setShowVoteFeedback(false), 3000);

      console.log(`Vote submitted for ${voteFor}`);
    } catch (err) {
      console.error("Error submitting vote:", err);
    }
  };

  return (
    <Card className="bg-[#111827] border-slate-800 backdrop-blur-xl p-4 rounded-3xl">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg text-white font-semibold">Audience Poll</h2>
        <Button
          variant="ghost"
          size="icon"
          className="size-8 text-gray-400 hover:text-white hover:bg-zinc-800"
          onClick={handleShareLink}
        >
          {copied ? (
            <span className="text-xs text-emerald-500">Copied!</span>
          ) : (
            <Share2 className="size-4" />
          )}
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-4 animate-pulse">
          <div className="h-12 bg-zinc-800 rounded-lg" />
          <div className="h-12 bg-zinc-800 rounded-lg" />
          <div className="grid grid-cols-2 gap-3 mt-4">
            <div className="h-10 bg-zinc-800 rounded-lg" />
            <div className="h-10 bg-zinc-800 rounded-lg" />
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="relative h-12">
            <div className="absolute bg-zinc-900 inset-0 rounded-lg" />
            <motion.div
              className="absolute inset-y-0 left-0 bg-sky-700 rounded-lg"
              initial={{ width: "0%" }}
              animate={{ width: `${getPercentage(votes.human)}%` }}
              transition={{ duration: 0.5 }}
            />
            <div className="absolute inset-0 flex items-center justify-between px-3">
              <span className="font-medium">Human PMs</span>
              <span>{getPercentage(votes.human).toFixed(1)}%</span>
            </div>
          </div>

          <div className="relative h-12">
            <div className="absolute inset-0 bg-zinc-900 rounded-lg" />
            <motion.div
              className="absolute inset-y-0 left-0 bg-teal-700 rounded-lg"
              initial={{ width: "0%" }}
              animate={{ width: `${getPercentage(votes.ai)}%` }}
              transition={{ duration: 0.5 }}
            />
            <div className="absolute inset-0 flex items-center justify-between px-3">
              <span className="font-medium">AI</span>
              <span>{getPercentage(votes.ai).toFixed(1)}%</span>
            </div>
          </div>

          {showVoteFeedback && (
            <div className="text-center text-sm mt-2 text-emerald-500">
              Thanks! Your vote for {lastVote === "human" ? "Human PMs" : "AI"}{" "}
              was recorded.
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 mt-4">
            <Button
              variant="outline"
              className="border-blue-500/50 hover:bg-sky-600"
              onClick={() => handleVoteClick("human")}
            >
              Vote Human
            </Button>
            <Button
              variant="outline"
              className="border-teal-500/50 hover:bg-teal-600"
              onClick={() => handleVoteClick("ai")}
            >
              Vote AI
            </Button>
          </div>

          <div className="text-center text-xs text-gray-500 mt-1">
            Total votes: {totalVotes}
          </div>
        </div>
      )}
    </Card>
  );
}
