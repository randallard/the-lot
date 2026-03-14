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
    const { systemPrompt, gameResults, context, messages, useTool, useEscalate } = await req.json();

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
      description: "Send your response to the player. This is a game where the whole point is getting the player to open their phone and challenge NPCs to games. Set continues=true if your response naturally invites a reply. Set continues=false if you're wrapping up. Always provide a defaultReply. When the conversation is winding down, set defaultAction to 'play' so the player can jump straight into a game by hitting enter.",
      input_schema: {
        type: "object" as const,
        properties: {
          dialogue: { type: "string", description: "What you say to the player" },
          continues: { type: "boolean", description: "True if the player should get a chance to reply" },
          defaultReply: { type: "string", description: "A short default the player might say — pre-filled so they can hit enter to move on" },
          defaultAction: { type: "string", enum: ["chat", "play"], description: "What happens when the player sends the defaultReply. 'play' = start a game, 'chat' = send as chat message. Use 'play' when the conversation is naturally ending." },
        },
        required: ["dialogue", "continues", "defaultReply", "defaultAction"],
      },
    };

    const escalateTool = {
      name: "escalate_to_ryan",
      description: "Use this when the player wants to send feedback, report a bug, make a suggestion, or ask something you can't answer. This opens a form where they can write a message and optionally leave their email. Say something like 'let me get that to Ryan' in your dialogue.",
      input_schema: {
        type: "object" as const,
        properties: {
          dialogue: { type: "string", description: "What you say to the player before the form opens — e.g. 'I'll pass that along to Ryan, he'll get back to you'" },
        },
        required: ["dialogue"],
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
    } else if (useEscalate) {
      apiBody.tools = [escalateTool];
      // Let the model decide whether to escalate (auto) — don't force it
      apiBody.tool_choice = { type: "auto" };
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
    let defaultAction = "chat";
    let escalate = false;

    const toolBlock = data.content?.find((b: { type: string }) => b.type === "tool_use");
    if (toolBlock?.name === "escalate_to_ryan" && toolBlock?.input) {
      dialogue = toolBlock.input.dialogue ?? "let me pass that along to Ryan";
      escalate = true;
    } else if (toolBlock?.input) {
      dialogue = toolBlock.input.dialogue ?? dialogue;
      continues = !!toolBlock.input.continues;
      defaultReply = toolBlock.input.defaultReply ?? "";
      defaultAction = toolBlock.input.defaultAction ?? "chat";
    } else {
      dialogue = data.content?.[0]?.text ?? dialogue;
    }

    return new Response(JSON.stringify({ dialogue, continues, defaultReply, defaultAction, escalate }), {
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
