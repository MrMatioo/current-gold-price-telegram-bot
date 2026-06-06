import { Bot } from "grammy";
import dotenv from "dotenv";
import http from "http";

dotenv.config();

const botToken = process.env.BOT_TOKEN;
const apiLink = process.env.GOLD_API;
const channel = process.env.CHANNEL_USERNAME;
const apiKey = process.env.KEY;

if (!botToken || !apiLink || !channel || !apiKey) {
  console.error("Missing env variables");
  process.exit(1);
}

const bot = new Bot(botToken);
let lastPrice: number | null = null;

const server = http.createServer((_req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("Bot is running");
});
server.listen(5000, () => console.log("HTTP server on port 5000"));

const fetchPrice = async (): Promise<number> => {
  const res = await fetch(apiLink, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  const priceObj = json?.data?.prices?.GOLD18K;
  if (!priceObj?.current) throw new Error("Invalid API response");
  return parseInt(priceObj.current, 10);
};

const formatMessage = (current: number, prev: number | null): string => {
  const toman = (current / 10).toLocaleString("fa-IR");
  if (prev === null) return `💰 طلای ۱۸ عیار: ${toman} تومان (اولین دریافت)`;
  const diffRial = current - prev;
  const diffToman = diffRial / 10;
  const percent = (diffRial / prev) * 100;
  const arrow = diffRial > 0 ? "▲" : diffRial < 0 ? "▼" : "●";
  const sign = diffRial > 0 ? "+" : "";
  return `💰 طلای ۱۸ عیار: ${toman} تومان\n📊 ${arrow} ${sign}${diffToman.toLocaleString("fa-IR")} تومان (${sign}${percent.toFixed(2)}%)`;
};

async function main() {
  try {
    const current = await fetchPrice();
    const text = formatMessage(current, lastPrice);
    await bot.api.sendMessage(channel!, text);
    console.log("Sent:", text);
    lastPrice = current;
  } catch (err: any) {
    console.error("MAIN ERROR:", err?.message || err);
  }
}

bot.start().catch(console.error);

main();
setInterval(() => main(), 10 * 60 * 1000);
