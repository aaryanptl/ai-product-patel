export interface Database {
  public: {
    Tables: {
      rt_debates: {
        Row: {
          id: string;
          created_at: string;
          title: string;
          description: string | null;
          is_active: boolean;
        };
        Insert: {
          id?: string;
          created_at?: string;
          title: string;
          description?: string | null;
          is_active?: boolean;
        };
        Update: {
          id?: string;
          created_at?: string;
          title?: string;
          description?: string | null;
          is_active?: boolean;
        };
      };
      rt_votes: {
        Row: {
          id: string;
          created_at: string;
          debate_id: string;
          vote_for: "human" | "ai";
          voter_id: string | null;
          voter_ip: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          debate_id: string;
          vote_for: "human" | "ai";
          voter_id?: string | null;
          voter_ip?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          debate_id?: string;
          vote_for?: "human" | "ai";
          voter_id?: string | null;
          voter_ip?: string | null;
        };
      };
    };
  };
}

export type RealtimeVotePayload = {
  id: string;
  debate_id: string;
  vote_for: "human" | "ai";
  voter_id?: string;
  voter_ip?: string;
  created_at: string;
};
