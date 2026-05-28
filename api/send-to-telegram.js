export default async function handler(req, res) {
  // Настройка CORS (чтобы браузер не блокировал запрос)
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*'); 
  res.setHeader('Access-Control-Allow-Methods', 'OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Ответ на технический "предзапрос" браузера (Preflight)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Защита: принимаем только POST
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, message: 'Метод не разрешен (только POST)' });
  }

  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!botToken || !chatId) {
      throw new Error('Токены бота не настроены в Environment Variables на Vercel!');
    }

    // Читаем данные. Если Vercel прислал строку, делаем из неё JSON
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { nickname, date, job, extraJobs, time, contact, about, signature } = body || {};

    if (!signature) {
      throw new Error('Подпись не была передана.');
    }

    // Красивый шаблон сообщения для Telegram
    const caption = `
📜 <b>НОВЫЙ ДОГОВОР: ФРОСТХЕВЕН</b> 📜

👤 <b>Ник:</b> ${nickname || 'Не указан'}
📅 <b>Дата захода:</b> ${date || 'Не указана'}
📞 <b>Связь:</b> ${contact || 'Не указана'}
⏱ <b>Прайм-тайм:</b> ${time || 'Не указано'}

⚙️ <b>Профессия:</b> ${job || 'Не указана'}
🔧 <b>Доп. роли:</b> ${extraJobs && extraJobs.length > 0 ? extraJobs.join(', ') : 'Нет'}

💬 <b>Мотивация:</b> 
<i>"${about || 'Нет'}"</i>
    `.trim();

    // 1. Превращаем картинку из Base64 обратно в бинарный файл (Node.js Buffer)
    const base64Data = signature.replace(/^data:image\/\w+;base64,/, "");
    const imageBuffer = Buffer.from(base64Data, 'base64');

    // 2. Вручную собираем Multipart/form-data (самый надежный способ для бессерверных функций)
    const boundary = '----FrosthavenBoundary' + Math.random().toString(16).substring(2);
    const nl = '\r\n';
    let bodyBuffer = Buffer.alloc(0);

    // Функция-помощник для добавления текстовых полей
    function appendField(name, value) {
      bodyBuffer = Buffer.concat([
        bodyBuffer,
        Buffer.from(`--${boundary}${nl}Content-Disposition: form-data; name="${name}"${nl}${nl}${value}${nl}`)
      ]);
    }

    appendField('chat_id', chatId);
    appendField('caption', caption);
    appendField('parse_mode', 'HTML');

    // Функция-помощник для добавления файла (картинки)
    bodyBuffer = Buffer.concat([
      bodyBuffer,
      Buffer.from(`--${boundary}${nl}Content-Disposition: form-data; name="photo"; filename="signature.png"${nl}Content-Type: image/png${nl}${nl}`),
      imageBuffer,
      Buffer.from(`${nl}--${boundary}--${nl}`)
    ]);

    // 3. Отправляем готовые бинарные данные в Telegram
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`
      },
      body: bodyBuffer
    });

    const result = await response.json();

    if (result.ok) {
      return res.status(200).json({ ok: true });
    } else {
      console.error("Telegram Error:", result);
      throw new Error(`Ошибка Telegram: ${result.description}`);
    }

  } catch (error) {
    console.error("Backend Error:", error);
    // Возвращаем ошибку с кодом 400 (или 500), чтобы сайт понял, что случилась проблема
    return res.status(400).json({ ok: false, message: error.message });
  }
}
