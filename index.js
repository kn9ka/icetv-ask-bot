const Telegraf = require('telegraf').Telegraf;
const { message } = require('telegraf/filters');
require('dotenv').config();
const bot = new Telegraf(process.env.TOKEN);
const { authenticate, writeToSheet } = require('./google.js');

const questionnary = {
  how_long: {
    question: 'Как давно вы в США? 🇺🇸',
    answers: ['Меньше 1 года', '1-3 года', '3-5 лет', 'более 5 лет'],
  },
  creditCards: {
    question: 'У вас уже есть кредитный карты?',
    answers: ['Да', 'Нет'],
  },
  creditScore: {
    question: 'Какой у вас Credit Score?',
    answers: ['0-650', '650-700', '700-750', '750+'],
  },
  overdue: {
    question: 'У вас были просроченные платежи по кредиту?',
    answers: ['Да', 'Нет'],
  },
};
const line = ['how_long', 'creditCards', 'creditScore', 'overdue'];
let result = {};

let state = 'idle';

const CHAT_ID = process.env.CHAT_ID;

console.log('BOT RUNS');
bot.command('start', async (ctx) => {
  const msg = await ctx.reply('Для связи с оператором нажмите на кнопку ниже', {
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: 'Связаться с оператором',
            url: 'https://t.me/creditshark',
          },
        ],
      ],
    },
  });
  await ctx.pinChatMessage(msg.message_id, { disable_notification: true });
  await ctx.reply(
    `
<b>Вас приветствует сервис повышения кредитного рейтинга "Credit Shark"</b>

Мы предоставляем услуги повышения credit score онлайн а также у нас есть офисы во всех крупных городах Америки.

🌐 <a href="https://creditshark.pro/">НАШ САЙТ</a>
✍️ <a href="https://t.me/creditshark_info">МЫ В ТЕЛЕГРАМ</a>

Также наши услуги:

Обмен валют в США и по всему миру. Обмен Zelle | <a href="https://t.me/obmen_la_ca">Obmenca</a>
Маркетинговое агенство. Реклама под ключ | <a href="http://t.me/sharkads_agency">Shark Ads Agency</a>

✅ Работаем без выходных`,
    {
      reply_markup: {
        inline_keyboard: [
          [
            { text: '🆙 Повысить credit score', url: 'https://t.me/creditshark' },
            { text: '👩‍💻 Узнать подробности', url: 'https://t.me/creditshark_info' },
          ],
          [{ text: 'Наш сайт 🌐', url: 'https://creditshark.pro/' }],
          [{ text: '💸 Обменять валюту', url: 'https://t.me/rfice220' }],
        ],
      },
      parse_mode: 'HTML',
      link_preview_options: { is_disabled: true },
    }
  );
  let text = `Для того чтобы оставить заявку, потребуется пройти небольшой опросник`;
  await ctx.reply(text);

  currentQuestion = line[0];
  const firstQuestion = questionnary[currentQuestion];
  text = firstQuestion.question;

  await ctx.reply(text, {
    reply_markup: {
      inline_keyboard: [
        ...firstQuestion.answers.map((txt) => [
          { text: txt, callback_data: `${JSON.stringify({ question: currentQuestion, answer: txt })}` },
        ]),
      ],
    },
  });
  state = 'in_progress';
  result.username = `@${ctx.from.username}`;
  result.fullname = `${ctx.from.last_name} ${ctx.from.first_name}`;
});

bot.on(message('text'), async (ctx) => {
  if (state !== 'in_progress') {
    ctx.reply(`Используйте /start чтобы пройти небольшой опрос`);
  }
});

bot.on('callback_query', async (ctx) => {
  const callbackData = ctx.callbackQuery.data;
  const { question, answer } = JSON.parse(callbackData);
  result[question] = answer;

  await ctx.answerCbQuery(answer);

  currentQuestionIndex = line.findIndex((v) => v === question);
  const nextQuestionIndex = line[currentQuestionIndex + 1];

  if (nextQuestionIndex) {
    const nextQuestion = questionnary[nextQuestionIndex];
    text = nextQuestion.question;

    await ctx.reply(text, {
      reply_markup: {
        inline_keyboard: [
          ...nextQuestion.answers.map((txt) => [
            { text: txt, callback_data: `${JSON.stringify({ question: nextQuestionIndex, answer: txt })}` },
          ]),
        ],
      },
    });
  } else {
    try {
      const googleAuth = await authenticate();
      await writeToSheet(googleAuth, Object.values(result));
    } catch (e) {
      throw e;
    }

    await ctx.reply('Опрос закончен, спасибо. В ближайшее время с вами свяжется наш оператор для продолжения диалога');
    try {
      await ctx.telegram.sendMessage(
        CHAT_ID,
        `Новая заявка от ${result.username}, посмотреть: https://docs.google.com/spreadsheets/d/1h_-Mp-8afHWqw3rW1oSrpbTj3owbYeoHkOWWvlYJfqg/edit?gid=0#gid=0`
      );
    } catch (e) {
      console.log('error');
    }

    state = 'idle';
    result = {};
  }
});

bot.launch();

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
