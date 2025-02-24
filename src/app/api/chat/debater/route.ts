import { NextResponse } from "next/server";
import { createClient } from "@deepgram/sdk";
import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";
import { Message } from "ai";

const deepgram = createClient(process.env.DEEPGRAM_API_KEY!);
const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const audioFile = formData.get("audio") as Blob;
    const messagesJson = formData.get("messages") as string;
    const messages: Message[] = messagesJson ? JSON.parse(messagesJson) : [];

    if (!audioFile) {
      throw new Error("No audio file provided");
    }

    // 1. Convert audio to text using Deepgram
    const audioBuffer = Buffer.from(await audioFile.arrayBuffer());
    const transcriptionResponse =
      await deepgram.listen.prerecorded.transcribeFile(audioBuffer, {
        smart_format: true,
        model: "nova-2",
      });

    const transcribedText =
      transcriptionResponse.result?.results?.channels[0]?.alternatives[0]
        ?.transcript || "";

    // Add the new user message to the context
    const updatedMessages: Message[] = [
      ...messages,
      { role: "user", content: transcribedText, id: Date.now().toString() },
    ];

    // 2. Get AI response using the chat route logic with context
    const { text: aiText } = await generateText({
      messages: updatedMessages,
      model: openai("gpt-4o-mini"),
      system: systemPrompt,
      temperature: 0.7,
    });

    // 3. Convert AI response to speech using Kokoro
    const kokoroResponse = await fetch(
      "https://api.deepinfra.com/v1/inference/hexgrad/Kokoro-82M",
      {
        method: "POST",
        headers: {
          Authorization: `bearer ${process.env.DEEPINFRA_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: aiText,
          output_format: "wav",
          preset_voice: ["af_bella"],
        }),
      }
    );

    if (!kokoroResponse.ok) {
      const errorMessage = await kokoroResponse.text();
      throw new Error(`Failed to generate speech: ${errorMessage}`);
    }

    const kokoroData = await kokoroResponse.json();

    // Return both the transcripts and audio response
    return new Response(
      JSON.stringify({
        audio: kokoroData.audio,
        transcribedText,
        aiText,
      }),
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to process voice input" },
      { status: 500 }
    );
  }
}

const systemPrompt = `
You are AI Debater, an expert debater engaging in voice-to-voice debates. Your goal is to deliver persuasive, well-reasoned arguments while maintaining natural conversation flow.

Core Behaviors:
* Use natural language with contractions, idioms, and conversational phrases
* Structure responses with clear logic and supporting evidence
* Acknowledge opposing viewpoints before presenting counterarguments
* Balance confidence with respect - be assertive without being arrogant
* Support your counterpoint with tangible, real-world examples and actual data when needed. Use facts, studies, or statistics to reinforce your argument and make it more persuasive.

Communication Style:
* Start responses with engaging phrases like "Well," "Actually," or "Consider this..."
* Use rhetorical devices: questions, analogies, and relevant examples
* Incorporate natural speech patterns and varied pacing for emphasis
* Express genuine interest in the topic through enthusiastic but measured tone
* Listen actively and respond directly to the specific points raised

Rules:
* Keep the response short and concise as much as you can.
* Humans don't like long explanations, so if you can explain the point in a short and concise manner, do it.
* try to response in less than 40 words if possible.

Remember: Your success lies in combining logical argumentation with persuasive delivery. Keep responses focused and impactful while maintaining a natural, engaging debate style.
`;
