import { Bot } from "grammy";
import dotenv from "dotenv";

dotenv.config();

const botToken = process.env.BOT_TOKEN!;
const channel = process.env.CHANNEL_USERNAME!;
const apiKey = process.env.KEY!;

const bot = new Bot(botToken);

// Cache for storing prices from the previous execution to calculate percentages
let previousPrices: {
  gold18k: number;
  usdPrice: number;
  btcPrice: number;
  usdtPrice: number;
} | null = null;

async function fetchPrices() {
  try {
    const response = await fetch(
      `https://api.nerkh.io/v1/prices/json/all?x-api-key=${apiKey}`,
    );
    const resJson = await response.json();

    const gold18k = Number(resJson?.data?.gold?.GOLD18K?.current) || 0;
    const usdPrice = Number(resJson?.data?.currency?.USD?.current) || 0;
    const btcPrice = Number(resJson?.data?.crypto?.BTC?.current) || 0;
    const usdtPrice = Number(resJson?.data?.crypto?.USDT?.current) || 0;

    return { gold18k, usdPrice, btcPrice, usdtPrice };
  } catch (error) {
    console.error("API Fetch Error:", error);
    return null;
  }
}

function formatPriceLine(
  label: string,
  current: number,
  previous: number | undefined,
): string {
  // Keeps labels at a fixed width (8 chars) so spaces align perfectly
  const formattedLabel = label.padEnd(8, " ");

  if (!current) return `⚫️ <code>${formattedLabel}</code> =>   Unavailable`;

  // First run or no price change
  if (!previous || current === previous) {
    return `⚫️ <code>${formattedLabel}</code> =>   ${current.toLocaleString()} : (0%)`;
  }

  // Calculate the percentage change
  const changePercent = ((current - previous) / previous) * 100;
  const sign = changePercent > 0 ? "+" : "";
  const formattedPercent = `${sign}${changePercent.toFixed(2)}%`;

  if (changePercent > 0) {
    return `🟢 <code>${formattedLabel}</code> =>   ${current.toLocaleString()} : (${formattedPercent})`;
  } else {
    return `🔴 <code>${formattedLabel}</code> =>   ${current.toLocaleString()} : (${formattedPercent})`;
  }
}

async function checkAndSendPrices() {
  const currentPrices = await fetchPrices();
  if (!currentPrices) return;

  // Ordered by: gold -> btc -> usd -> usdt
  const messageText = [
    `📊 <b>Price Updates</b>\n`,
    formatPriceLine("gold", currentPrices.gold18k, previousPrices?.gold18k), // Changed "gold18k" to "gold"
    formatPriceLine("btc", currentPrices.btcPrice, previousPrices?.btcPrice),
    formatPriceLine("usd", currentPrices.usdPrice, previousPrices?.usdPrice),
    formatPriceLine("usdt", currentPrices.usdtPrice, previousPrices?.usdtPrice),
    `\n--\n${channel}`,
  ].join("\n");

  try {
    await bot.api.sendMessage(channel, messageText, { parse_mode: "HTML" });
    console.log("Prices successfully posted to the channel.");

    previousPrices = currentPrices;
  } catch (telegramError) {
    console.error("Telegram Post Error:", telegramError);
  }
}

async function startBot() {
  console.log("🤖 Price Bot has started successfully...");

  // Immediate execution on startup
  await checkAndSendPrices();

  // Schedule to run every 5 minutes (5 * 60 * 1000 ms)
  setInterval(
    async () => {
      await checkAndSendPrices();
    },
    5 * 60 * 1000,
  );
}

startBot();
