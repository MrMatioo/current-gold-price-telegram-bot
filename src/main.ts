import { Bot } from "grammy";
import dotenv from "dotenv";
import http from "http";
dotenv.config();

const botToken = process.env.BOT_TOKEN as string;
const apiLink = process.env.GOLD_API as string;
const channel = process.env.CHANNEL_USERNAME as string;
const key = process.env.KEY;
const server = http.createServer();
const bot = new Bot(botToken);

let lastPrice: number | null = null;

const fetchPrice = async () => {
  const response = await fetch(apiLink, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
  });
  const result = await response.json();
  const gold18k = result.data.prices.GOLD18K;
  if (!gold18k || !gold18k.current) throw new Error("Price not found");
  return parseInt(gold18k.current, 10);
};

const formatMessage = (currentPrice: number, previousPrice: number | null) => {
  const currentTomans = (currentPrice / 10).toLocaleString("fa-IR");
  let changeText = "";

  if (previousPrice !== null) {
    const changeRial = currentPrice - previousPrice;
    const changeToman = changeRial / 10;
    const changePercent = (changeRial / previousPrice) * 100;
    const arrow = changeRial > 0 ? "▲" : changeRial < 0 ? "▼" : "●";
    const sign = changeRial > 0 ? "+" : "";
    changeText = `\n📊 تغییر نسبت به اپدیت قبلی: ${arrow} ${sign}${changeToman.toLocaleString("fa-IR")} تومان (${sign}${changePercent.toFixed(2)}%)`;
  } else {
    changeText = "\n📌 اولین دریافت است، داده قبلی موجود نیست.";
  }

  return ` ${currentTomans} تومان${changeText}`;
};

async function main() {
  try {
    const currentPrice = await fetchPrice();
    const text = formatMessage(currentPrice, lastPrice);
    await bot.api.sendMessage(channel, text);
    console.log("Message sent:", text);
    lastPrice = currentPrice;
  } catch (error) {
    console.error("Error:", error);
  }
}

server.listen(5000, () => {
  console.log("server is running on port 5000");
});
main();

setInterval(
  () => {
    main().catch(console.error);
  },
  10 * 60 * 1000,
);
