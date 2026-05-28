export default async function handler(req, res) {
  // Настройка CORS (чтобы сайт мог обращаться к серверу Vercel)
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*'); // Разрешаем всем (можно заменить на домен сайта)
  res.setHeader('Access-Control-Allow-Methods', 'OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Ответ на предзапрос браузера
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Запрещаем все кроме POST
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  // Подключаем переменные из настроек Vercel (Environment Variables)
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) {
    return res.status(500).json({ ok: false, message: 'Server error: Tokens missing in Vercel settings.' });
  }

  // Получаем все данные из запроса сайта
  const { nickname, date, job, extraJobs, time, contact, about, signature } = req.body;

  // Формируем красивый текст сообщения
  const caption = `
📜 <b>НОВЫЙ ДОГОВОР: ФРОСТХЕВЕН</b> 📜

👤 <b>Ник:</b> ${nickname}
📅 <b>Дата захода:</b> ${date}
📞 <b>Связь:</b> ${contact}
⏱ <b>Прайм-тайм:</b> ${time}

⚙️ <b>Профессия:</b> ${job}
🔧 <b>Доп. роли:</b> ${extraJobs && extraJobs.length > 0 ? extraJobs.join(', ') : 'Нет'}

💬 <b>Мотивация:</b> 
<i>"${about}"</i>
  `;

  try {
    // 1. Извлекаем "чистую" Base64 строку картинки, убирая служебный префикс
    const base64Data = signature.replace(/^data:image\/\w+;base64,/, "");
    
    // 2. Превращаем строку обратно в файл (бинарный буфер)
    const imageBuffer = Buffer.from(base64Data, 'base64');

    // 3. Используем стандартный FormData для отправки картинки
    const form = new FormData();
    form.append('chat_id', chatId);
    form.append('caption', caption);
    form.append('parse_mode', 'HTML');
    
    // Запаковываем буфер как файл
    const blob = new Blob([imageBuffer], { type: 'image/png' });
    form.append('photo', blob, 'signature.png');

    // 4. Отправляем запрос к API Telegram (метод sendPhoto!)
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
      method: 'POST',
      body: form
    });

    const result = await response.json();

    if (result.ok) {
      res.status(200).json({ ok: true });
    } else {
      console.error("Telegram API Error:", result);
      res.status(400).json({ ok: false, message: result.description });
    }
  } catch (error) {
    console.error("Backend Error:", error);
    res.status(500).json({ ok: false, message: error.message });
  }
}
