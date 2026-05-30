export default async function handler(req, res) {
  // 1. Настройка CORS (разрешаем запросы)
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*'); 
  res.setHeader('Access-Control-Allow-Methods', 'OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Ответ на предзапрос браузера (CORS preflight)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Запрещаем все методы, кроме POST
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  // 2. Получаем токены из Vercel Environment Variables
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) {
    return res.status(500).json({ ok: false, message: 'Server error: Tokens missing in Vercel settings.' });
  }

  // 3. Получаем данные из запроса сайта
  const { nickname, date, job, extraJobs, time, contact, about, signature } = req.body || {};

  // Защита от пустых/неполных запросов
  if (!nickname || !contact || !signature) {
    return res.status(400).json({ ok: false, message: 'Отправлены не все обязательные данные.' });
  }

  // 4. ВАЖНО: Экранируем символы, чтобы Telegram API не блокировал сообщение с тегами (например, <3)
  const escapeHTML = (str) => {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  };

  // 5. Формируем красивый текст сообщения
  const caption = `
📜 <b>НОВЫЙ ДОГОВОР: ФРОСТХЕВЕН</b> 📜

👤 <b>Ник:</b> ${escapeHTML(nickname)}
📅 <b>Дата захода:</b> ${escapeHTML(date)}
📞 <b>Связь:</b> ${escapeHTML(contact)}
⏱ <b>Прайм-тайм:</b> ${escapeHTML(time)}

⚙️ <b>Профессия:</b> ${escapeHTML(job)}
🔧 <b>Доп. роли:</b> ${extraJobs && extraJobs.length > 0 ? escapeHTML(extraJobs.join(', ')) : 'Нет'}

💬 <b>Мотивация:</b> 
<i>"${escapeHTML(about)}"</i>
  `;

  try {
    // 6. Извлекаем "чистую" Base64 строку картинки, убирая служебный префикс
    const base64Data = signature.replace(/^data:image\/\w+;base64,/, "");
    
    // Превращаем строку обратно в файл (бинарный буфер)
    const imageBuffer = Buffer.from(base64Data, 'base64');

    // 7. Используем стандартный FormData для отправки картинки
    const form = new FormData();
    form.append('chat_id', chatId);
    form.append('caption', caption);
    form.append('parse_mode', 'HTML');
    
    // Запаковываем буфер как файл
    const blob = new Blob([imageBuffer], { type: 'image/png' });
    form.append('photo', blob, 'signature.png');

    // 8. Отправляем запрос к API Telegram
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
