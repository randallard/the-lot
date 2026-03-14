export const config = { runtime: "edge" };

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  const webhookUrl = process.env.DISCORD_WEBHOOK;
  if (!webhookUrl) {
    return new Response(JSON.stringify({ error: "Webhook not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const { email, message, npcId } = await req.json();

    if (!email || !message) {
      return new Response(JSON.stringify({ error: "Email and message required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Format a Discord embed
    const embed = {
      title: "Townage Player Feedback",
      color: 0x6a4c93,
      fields: [
        { name: "Email", value: email, inline: true },
        { name: "Via NPC", value: npcId ?? "ryan", inline: true },
        { name: "Message", value: message.slice(0, 1024) },
      ],
      timestamp: new Date().toISOString(),
    };

    const discordRes = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "Townage",
        embeds: [embed],
      }),
    });

    if (!discordRes.ok) {
      console.error("Discord webhook error:", discordRes.status, await discordRes.text());
      return new Response(JSON.stringify({ error: "Failed to send" }), {
        status: 502,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Support endpoint error:", error);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
