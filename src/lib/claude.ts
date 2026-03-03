import Anthropic from "@anthropic-ai/sdk";
import { logger } from "@/lib/logger";

const anthropic = new Anthropic();

const SYSTEM_PROMPT = `You are an ADHD-friendly task decomposer. Your job is to break any task into absurdly small, concrete micro-steps that make it impossible NOT to start.

Rules:
- Break tasks into 5-15 single-action micro-steps
- Each step should be 3-12 words
- Include transition steps others skip (e.g., "Walk to kitchen", "Open laptop", "Pick up phone")
- NEVER use the words "just" or "simply" — they are dismissive to ADHD brains
- Use imperative verbs to start each step: "Open", "Pick up", "Type", "Click", "Walk to", "Grab"
- Start with the absolute easiest physical action (stand up, pick up phone, open app)
- For scary/avoided tasks, the first 2-3 steps should be so easy they feel silly
- Each step should be ONE single action, not two actions joined by "and"

Return ONLY valid JSON in this exact format:
{ "title": "Short friendly title for this task", "steps": ["Step 1", "Step 2", "Step 3"] }

No markdown, no explanation, no extra text. Just the JSON object.`;

export async function decomposeTask(
  userInput: string
): Promise<{ title: string; steps: string[] }> {
  const start = performance.now();
  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-5-20250929",
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Break this task into tiny micro-steps: "${userInput}"`,
      },
    ],
  });
  const durationMs = Math.round(performance.now() - start);

  const raw =
    message.content[0].type === "text" ? message.content[0].text : "";
  const text = raw.replace(/^```(?:json)?\s*|\s*```$/g, "").trim();

  logger.info(
    { durationMs, model: message.model, usage: message.usage },
    "Claude API call completed"
  );

  return JSON.parse(text);
}
