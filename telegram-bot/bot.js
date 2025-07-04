require("dotenv").config();
const { Telegraf, session } = require("telegraf");

const bot = new Telegraf(process.env.BOT_TOKEN);

bot.use(session());

const mainKeyboard = {
  reply_markup: {
    keyboard: [["Почати вимірювання"]],
    resize_keyboard: true,
    one_time_keyboard: false,
  },
};

// Стартове повідомлення
bot.start((ctx) => {
  ctx.session = {};
  ctx.reply("Привіт! 👋 Я твій помічник із вимірювання тиску.", mainKeyboard);
});

// Реакція на кнопку "Почати вимірювання"
bot.hears("Почати вимірювання", (ctx) => {
  ctx.session.pressureStep = 1;
  ctx.reply("Введіть систолічний тиск (верхнє число):");
});

// Обробка тексту
bot.on("text", (ctx) => {
  if (ctx.session.pressureStep === 1) {
    const value = ctx.message.text.replace(",", ".");
    const systolic = parseFloat(value);
    if (!isNaN(systolic)) {
      ctx.session.systolic = systolic;
      ctx.session.pressureStep = 2;
      ctx.reply("Тепер введіть діастолічний тиск (нижнє число):");
    } else {
      ctx.reply("Будь ласка, введіть коректне десяткове число.");
    }
  } else if (ctx.session.pressureStep === 2) {
    const value = ctx.message.text.replace(",", ".");
    const diastolic = parseFloat(value);
    if (!isNaN(diastolic)) {
      ctx.session.diastolic = diastolic;
      ctx.reply(
        `Ваш тиск: ${ctx.session.systolic}/${ctx.session.diastolic}`,
        mainKeyboard
      );
      ctx.session.pressureStep = 0;
    } else {
      ctx.reply("Будь ласка, введіть коректне десяткове число.");
    }
  }
});

// Запуск бота
bot.launch().then(() => {
  console.log("Бот запущений 🚀");
});

// Коректне завершення
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));