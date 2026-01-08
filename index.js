import express from "express";
import fetch from "node-fetch";
import { setIntervalAsync } from "set-interval-async/dynamic";

/* ================= CONFIG ================= */

// URLs will come from environment variables
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;
const GAME_API_URL = process.env.GAME_API_URL;

// Polling interval in milliseconds (adjust as needed)
const POLL_INTERVAL = 10000;

// Optional batch delay in milliseconds (0 = immediate, 60000 = 1 minute)
const POST_DELAY = parseInt(process.env.POST_DELAY) || 0;

/* ================= STATE ================= */
let lastIndex = -1; // index of last sent message
let batch = [];     // for delayed posting

/* ================= HELPER FUNCTIONS ================= */

// Send a single message to Discord
async function sendToDiscord(message) {
  if (!DISCORD_WEBHOOK_URL) {
    console.error("DISCORD_WEBHOOK_URL not set!");
    return;
  }

  try {
    await fetch(DISCORD_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: message })
    });
  } catch (err) {
    console.error("Error sending to Discord:", err);
  }
}

// Parse the raw API text into messages
function parseMessages(raw) {
  const entries = raw.split("~").map(e => e.trim()).filter(e => e);

  return entries.map(e => {
    const match = e.match(/^\[\d+\]\s\[(.*?)\]\s(.+)$/);
    if (!match) return null;
    return { player: match[1], message: match[2] };
  }).filter(Boolean);
}

// Fetch API and process new messages
async function checkMessages() {
  if (!GAME_API_URL) {
    console.error("GAME_API_URL not set!");
    return;
  }

  try {
    const res = await fetch(GAME_API_URL);
    const raw = await res.text();
    const messages = parseMessages(raw);

    const newMessages = messages.slice(lastIndex + 1);
    if (newMessages.length === 0) return;

    lastIndex = messages.length - 1;

    if (POST_DELAY > 0) {
      batch.push(...newMessages);
    } else {
      for (const msg of newMessages) {
        await sendToDiscord(`💬 **${msg.player}:** ${msg.message}`);
      }
    }
  } catch (err) {
    console.error("Error fetching API:", err);
  }
}

/* ================= BATCH POSTING ================= */
if (POST_DELAY > 0) {
  setIntervalAsync(async () => {
    if (batch.length === 0) return;

    const content = batch.map(m => `💬 **${m.player}:** ${m.message}`).join("\n");
    await sendToDiscord(content);
    batch = [];
  }, POST_DELAY);
}

/* ================= EXPRESS SERVER (optional) ================= */
const app = express();
app.get("/", (req, res) => res.send("MW2 Webhook Relay running"));
app.listen(process.env.PORT || 3000, () =>
  console.log(`Webhook relay running on port ${process.env.PORT || 3000}`)
);

/* ================= POLLING ================= */
setIntervalAsync(checkMessages, POLL_INTERVAL);
