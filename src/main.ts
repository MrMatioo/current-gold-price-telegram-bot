import { Bot } from "grammy";
import dotenv from "dotenv";
import express from "express"; // فقط این خط اضافه شده

dotenv.config();

const botToken = process.env.BOT_TOKEN!;
const channel = process.env.CHANNEL_USERNAME!;
const apiKey = process.env.KEY!;

const bot = new Bot(botToken);

interface Prices {
  gold18k: number;
  usdPrice: number;
  btcPrice: number;
  usdtPrice: number;
}

let previousPrices: Prices | null = null;

async function fetchPrices(): Promise<Prices | null> {
  try {
    const response = await fetch(
      `https://api.nerkh.io/v1/prices/json/all?x-api-key=${apiKey}`,
    );
    if (!response.ok) throw new Error("Network response was not ok");

    const resJson = await response.json();
    return {
      gold18k: Number(resJson?.data?.gold?.GOLD18K?.current) || 0,
      usdPrice: Number(resJson?.data?.currency?.USD?.current) || 0,
      btcPrice: Number(resJson?.data?.crypto?.BTC?.current) || 0,
      usdtPrice: Number(resJson?.data?.crypto?.USDT?.current) || 0,
    };
  } catch (error) {
    console.error("API Fetch Error:", error);
    return null;
  }
}

function formatPriceLine(
  label: string,
  current: number,
  previous?: number,
): string {
  const formattedLabel = label.padEnd(7, " ");
  const formattedPrice = current.toLocaleString().padEnd(10, " ");

  if (!current) {
    return `⚫️ <code>${formattedLabel}</code>=> <code>${"Unavailable".padEnd(10, " ")}</code> : (0%)`;
  }

  if (previous === undefined || current === previous) {
    return `⚫️ <code>${formattedLabel}</code>=> <code>${formattedPrice}</code> : (0%)`;
  }

  const changePercent = ((current - previous) / previous) * 100;
  const sign = changePercent > 0 ? "+" : "";
  const formattedPercent = `${sign}${changePercent.toFixed(2)}%`;

  return changePercent > 0
    ? `🟢 <code>${formattedLabel}</code>=> <code>${formattedPrice}</code> : (${formattedPercent})`
    : `🔴 <code>${formattedLabel}</code>=> <code>${formattedPrice}</code> : (${formattedPercent})`;
}

async function sendMessageWithRetry(
  messageText: string,
  attempts = 5,
): Promise<void> {
  for (let i = 0; i < attempts; i++) {
    try {
      await bot.api.sendMessage(channel, messageText, {
        parse_mode: "HTML",
      });
      console.log("Prices successfully posted to the channel.");
      return;
    } catch (error) {
      console.error(`Attempt ${i + 1} - Telegram Post Error:`, error);
      if (i === attempts - 1) {
        console.error("Failed to send message after multiple attempts.");
      }
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }
}

async function checkAndSendPrices(): Promise<void> {
  const currentPrices = await fetchPrices();
  if (!currentPrices) return;

  const btcInUsdt =
    currentPrices.usdtPrice > 0
      ? Math.round(currentPrices.btcPrice / currentPrices.usdtPrice)
      : 0;
  const prevBtcInUsdt =
    previousPrices && previousPrices.usdtPrice > 0
      ? Math.round(previousPrices.btcPrice / previousPrices.usdtPrice)
      : undefined;

  const messageText = [
    `📊 <b>Price Updates</b>\n`,
    formatPriceLine("gold", currentPrices.gold18k, previousPrices?.gold18k),
    formatPriceLine("btc", btcInUsdt, prevBtcInUsdt),
    formatPriceLine("usd", currentPrices.usdPrice, previousPrices?.usdPrice),
    formatPriceLine("usdt", currentPrices.usdtPrice, previousPrices?.usdtPrice),
    `\n--\n${channel}`,
  ].join("\n");

  await sendMessageWithRetry(messageText);
  previousPrices = currentPrices;
}

// ---- فقط همین بخش اضافه شده ----
const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("Bot is running");
});

app.listen(PORT, () => {
  console.log(`✅ Dummy HTTP server is listening on port ${PORT}`);
});
// ---------------------------------

async function startBot(): Promise<void> {
  console.log("🤖 Price Bot has started successfully...");
  await checkAndSendPrices();
  setInterval(checkAndSendPrices, 5 * 60 * 1000);
}

startBot();
