require("dotenv").config();
const mongoose = require("mongoose");
const { Telegraf, session } = require("telegraf");

const bot = new Telegraf(process.env.BOT_TOKEN);
mongoose.connect(process.env.MONGODB_URI);

const PressureSchema = new mongoose.Schema({
  userId: Number,
  systolic: Number,
  diastolic: Number,
  date: { type: Date, default: Date.now },
});

const Pressure = mongoose.model("Pressure", PressureSchema);

bot.use(session());

const mainKeyboard = {
  reply_markup: {
    keyboard: [["Почати вимірювання", "Показати вимірювання"]],
    resize_keyboard: true,
    one_time_keyboard: false,
  },
};

// Стартове повідомлення
bot.start((ctx) => {
  ctx.session = {};
  ctx.reply("Привіт! 👋 Я твій помічник із вимірювання тиску.", mainKeyboard);
});

bot.hears("Показати вимірювання", async (ctx) => {
  const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
  const results = await Pressure.find({
    date: { $gte: twoDaysAgo },
  }).sort({ date: -1 });

  if (results.length === 0) {
    ctx.reply("За останні 2 дні вимірювань не знайдено.", mainKeyboard);
  } else {
    let msg = "Ваші вимірювання за останні 2 дні:\n";
    msg += results
      .map(
        (r) =>
          `${r.date.toLocaleString("uk-UA", {
            day: "2-digit",
            month: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          })}: ${r.systolic}/${r.diastolic}`
      )
      .join("\n");
    ctx.reply(msg, mainKeyboard);
  }
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

      const pressure = new Pressure({
        userId: ctx.from.id,
        systolic: ctx.session.systolic,
        diastolic: ctx.session.diastolic,
      });

      pressure
        .save()
        .then(() => {
          ctx.reply(
            `Ваш тиск: ${ctx.session.systolic}/${ctx.session.diastolic}`,
            mainKeyboard
          );
        })
        .catch((err) => {
          ctx.reply("Сталася помилка при збереженні в базу даних.");
        });

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
