export const config = { runtime: "edge" };

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "API key not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const { systemPrompt, gameResults, context, messages, useTool } = await req.json();

    // Build messages: either from chat history or game results
    let apiMessages;
    if (messages && Array.isArray(messages)) {
      apiMessages = messages;
    } else {
      apiMessages = [
        {
          role: "user",
          content: `Game just ended. ${context} Score: player ${gameResults.playerScore} - ${gameResults.opponentScore} you. React casually — a few words is fine.`,
        },
      ];
    }

    const toolDef = {
      name: "respond",
      description: "Send your response to the player. Set continues=true if your response naturally invites a reply (e.g. you asked a question or made an offer). Set continues=false if you're wrapping up or just acknowledging. Always provide a defaultReply — a short, natural thing the player might say back (like 'sounds good', 'yeah!', 'nah I'm good', 'see ya').",
      input_schema: {
        type: "object" as const,
        properties: {
          dialogue: { type: "string", description: "What you say to the player" },
          continues: { type: "boolean", description: "True if the player should get a chance to reply" },
          defaultReply: { type: "string", description: "A short default response the player might say — pre-filled so they can just hit enter to move on" },
        },
        required: ["dialogue", "continues", "defaultReply"],
      },
    };

    const apiBody: Record<string, unknown> = {
      model: "claude-haiku-4-5-20251001",
      max_tokens: 200,
      system: systemPrompt,
      messages: apiMessages,
    };

    if (useTool) {
      apiBody.tools = [toolDef];
      apiBody.tool_choice = { type: "tool", name: "respond" };
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(apiBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Anthropic API error:", errorText);
      return new Response(JSON.stringify({ error: "Upstream API error" }), {
        status: 502,
        headers: { "Content-Type": "application/json" },
      });
    }

    const data = await response.json();

    // Extract response — tool use or plain text
    let dialogue = "good game!";
    let continues = false;
    let defaultReply = "";

    const toolBlock = data.content?.find((b: { type: string }) => b.type === "tool_use");
    if (toolBlock?.input) {
      dialogue = toolBlock.input.dialogue ?? dialogue;
      continues = !!toolBlock.input.continues;
      defaultReply = toolBlock.input.defaultReply ?? "";
    } else {
      dialogue = data.content?.[0]?.text ?? dialogue;
    }

    return new Response(JSON.stringify({ dialogue, continues, defaultReply }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("NPC chat error:", error);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
