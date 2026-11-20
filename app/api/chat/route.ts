import { createAnthropic } from "@ai-sdk/anthropic";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
export const runtime = "nodejs";
export const maxDuration = 60;
const allowed = new Set([
"claude-opus-5-5","claude-opus-5","claude-opus-4-8","claude-opus-4-7","claude-opus-4-6","claude-opus-4-5",
"claude-sonnet-5-5","claude-sonnet-5","claude-sonnet-4-6","claude-sonnet-4-5","claude-haiku-5-5","claude-haiku-4-5"
]);
export async function POST(req: Request) {
  try {
    const apiKey = process.env.VANNS_API_KEY;
    if (!apiKey) return Response.json({ error: "VANNS_API_KEY belum dipasang di Environment Variables Vercel." }, { status: 500 });
    const body = await req.json();
    const messages = body.messages as UIMessage[];
    const asked = typeof body.model === "string" ? body.model : "claude-sonnet-4-6";
    const modelId = allowed.has(asked) ? asked : "claude-sonnet-4-6";
    if (!Array.isArray(messages) || !messages.length) return Response.json({ error: "Pesan tidak ditemukan." }, { status: 400 });
    const provider = createAnthropic({ apiKey, baseURL: "https://api.vanns.my.id/v1" });
    const result = streamText({ model: provider(modelId), messages: await convertToModelMessages(messages), maxOutputTokens: 4096 });
    return result.toUIMessageStreamResponse({ onError: e => e instanceof Error ? e.message : "Gagal menghubungi VannAPI." });
  } catch (e) {
    console.error("VALEN API error:", e);
    return Response.json({ error: e instanceof Error ? e.message : "Server error." }, { status: 500 });
  }
}
