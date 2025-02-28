import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const googleAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || "");

export async function POST(req: Request) {
  try {
    const { transcript } = await req.json();

    if (!transcript || !Array.isArray(transcript) || transcript.length === 0) {
      return NextResponse.json(
        { error: "Invalid transcript data" },
        { status: 400 }
      );
    }

    // Format the transcript for the model to understand
    const formattedTranscript = transcript
      .map((item) => `${item.speaker}: ${item.text}`)
      .join("\n");

    // Create a prompt for Gemini to generate a summary
    const prompt = `
      Below is a transcript of a debate conversation between a Human and an AI:
      
      ${formattedTranscript}
      
      Please provide a brief summary (maximum 2-3 sentences) of the current state of this conversation.
      Focus on the main points, areas of agreement/disagreement, and overall direction of the discussion.
      Keep your summary concise, neutral, and factual.
      Focus on the most recent pair of messages in the conversation. and tell direclty what is the current topic of the conversation. Keep it short and concise.
    `;

    // Generate the summary using Gemini
    const model = googleAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const result = await model.generateContent(prompt);
    const summary = result.response.text();

    return NextResponse.json({ summary });
  } catch (error) {
    console.error("Error generating summary:", error);
    return NextResponse.json(
      { error: "Failed to generate summary" },
      { status: 500 }
    );
  }
}
