import { Bot } from "grammy";
import dotenv from "dotenv";
dotenv.config();

const botToken = process.env.BOT_TOKEN as string;
const apiLink = process.env.GOLD_API as string;
const channel = process.env.CHANNEL_USERNAME as string;

const bot = new Bot(botToken);

const fetchPrice = async (apiLink: string) => {
  const response = await fetch(apiLink);
  const prices = await response.json();
  const goldPrice = prices.filter((item: any) => item.symbol === "IR_GOLD_18K");
  return goldPrice[0];
};

const formater = (price: any) => {
  return `${price.name}   ${price.price}   ${price.change_percent}%`;
};

async function main() {
  try {
    const priceData = await fetchPrice(apiLink);
    if (!priceData) {
      console.log("Gold price not found");
      return;
    }
    const text = formater(priceData);
    await bot.api.sendMessage(channel, text);
    console.log("Message sent:", text);
  } catch (error) {
    console.error("Error:", error);
  }
}

main();
