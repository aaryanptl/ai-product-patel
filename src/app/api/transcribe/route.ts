import { NextResponse } from "next/server";
import { createClient } from "@deepgram/sdk";

const deepgram = createClient(process.env.DEEPGRAM_API_KEY!);

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const audioFile = formData.get("audio") as File;

    if (!audioFile) {
      return NextResponse.json(
        { error: "No audio file provided" },
        { status: 400 }
      );
    }

    const arrayBuffer = await audioFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { result, error } = await deepgram.listen.prerecorded.transcribeFile(
      buffer,
      {
        smart_format: true,
        model: "nova-2",
      }
    );

    const transcript =
      result?.results?.channels[0]?.alternatives[0]?.transcript;

    if (!transcript || error) {
      return NextResponse.json(
        { error: "Failed to transcribe audio" },
        { status: 500 }
      );
    }

    return NextResponse.json({ text: transcript });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { error: "Failed to process audio" },
      { status: 500 }
    );
  }
}
