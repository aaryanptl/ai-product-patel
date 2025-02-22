// app/api/generate-speech/route.js

export async function POST(request: Request) {
  try {
    // Parse the incoming JSON request
    const body = await request.json();
    const { text, output_format, preset_voice, speed, stream, webhook } = body;

    // Build the payload using provided values or defaults
    const payload = {
      text,
      output_format: output_format || "wav",
      preset_voice: preset_voice || ["af_bella"],
      ...(speed && { speed }),
      ...(stream !== undefined && { stream }),
      ...(webhook && { webhook }),
    };

    // Call the DeepInfra API endpoint
    const response = await fetch(
      "https://api.deepinfra.com/v1/inference/hexgrad/Kokoro-82M",
      {
        method: "POST",
        headers: {
          Authorization: `bearer ${process.env.DEEPINFRA_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }
    );

    if (!response.ok) {
      const errorMessage = await response.text();
      return new Response(JSON.stringify({ error: errorMessage }), {
        status: response.status,
      });
    }

    const data = await response.json();
    return new Response(JSON.stringify(data), { status: 200 });
  } catch (error) {
    console.error("Error calling DeepInfra API:", error);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
    });
  }
}
