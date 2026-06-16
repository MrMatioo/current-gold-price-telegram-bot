import { Bot } from "grammy";
import dotenv from "dotenv";
import http from "http";

dotenv.config();

const requiredEnv = [
  "BOT_TOKEN",
  "GOLD_API",
  "USD_API",
  "CHANNEL_USERNAME",
  "KEY",
];
for (const key of requiredEnv) {
  if (!process.env[key]) {
    console.error(`Missing env: ${key}`);
    process.exit(1);
  }
}

const botToken = process.env.BOT_TOKEN!;
const goldAPI = process.env.GOLD_API!;
const usdAPI = process.env.USD_API!;
const channel = process.env.CHANNEL_USERNAME!;
const apiKey = process.env.KEY!;

const bot = new Bot(botToken);

const server = http.createServer((_req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("Bot is running");
});
server.listen(5000, () => console.log("HTTP server on port 5000"));

let lastGoldPrice: number | null = null;
let lastUsdPrice: number | null = null;

async function fetchPrice(
  url: string,
  label: string,
  key: string,
): Promise<number> {
  const res = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} for ${label}`);
  }

  const json: any = await res.json();
  const price = json?.data?.prices?.[key]?.current;
  if (typeof price !== "string" && typeof price !== "number") {
    throw new Error(`Invalid response for ${label}: key ${key} not found`);
  }
  return parseFloat(String(price));
}

const formatMessage = (current: number, prev: number | null): string => {
  const toman = current.toLocaleString("en-US");
  if (prev === null) return `⚫${toman}`;
  const diffRial = current - prev;
  const percent = (diffRial / prev) * 100;
  const arrow = diffRial > 0 ? "🟢" : diffRial < 0 ? "🔴" : "⚫";
  const sign = diffRial > 0 ? "+" : "";
  return ` ${arrow}${toman} Toman  (${sign}${percent.toFixed(2)})%`;
};

async function main() {
  try {
    const [goldPrice, usdPrice] = await Promise.all([
      fetchPrice(goldAPI, "Gold", "GOLD18K"),
      fetchPrice(usdAPI, "USD", "USD"),
    ]);

    const goldText = formatMessage(goldPrice, lastGoldPrice);
    const usdText = formatMessage(usdPrice, lastUsdPrice);

    const fullMessage = `Gold:${goldText}\nUSD:${usdText}`;

    await bot.api.sendMessage(channel, fullMessage);
    console.log("Sent:", fullMessage);

    lastGoldPrice = goldPrice;
    lastUsdPrice = usdPrice;
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("MAIN ERROR:", errorMsg);
  }
}

main();
setInterval(() => main(), 5 * 60 * 1000);
