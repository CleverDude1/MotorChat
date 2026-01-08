import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

const WEBHOOK = process.env.DISCORD_WEBHOOK_URL;

app.post("/lobby-message", async (req, res) => {
  const { player, message } = req.body;

  if (!player || !message) {
    return res.status(400).json({ error: "Invalid payload" });
  }

  const payload = {
    content: `💬 **${player}:** ${message}`
  };

  try {
    await fetch(WEBHOOK, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    res.json({ status: "sent" });
  } catch (err) {
    console.error("Webhook error:", err);
    res.status(500).json({ error: "Failed to send to Discord" });
  }
});

app.listen(process.env.PORT, () => {
  console.log(`Webhook relay listening on port ${process.env.PORT}`);
});
