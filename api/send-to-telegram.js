export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*'); 
  res.setHeader('Access-Control-Allow-Methods', 'OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  // Получаем строку с ID
  const chatIdsString = process.env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatIdsString) {
    return res.status(500).json({ ok: false, message: 'Server error: Tokens missing in Vercel settings.' });
  }

  const { nickname, date, job, extraJobs, time, contact, about, signature } = req.body || {};

  if (!nickname || !contact || !signature) {
    return res.status(400).json({ ok: false, message: 'Отправлены не все обязательные данные.' });
  }

  const escapeHTML = (str) => {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  };

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
    const base64Data = signature.replace(/^data:image\/\w+;base64,/, "");
    const imageBuffer = Buffer.from(base64Data, 'base64');

    // Разбиваем строку с ID по запятой и убираем лишние пробелы
    const chatIds = chatIdsString.split(',').map(id => id.trim());
    
    let successCount = 0;
    let lastError = null;

    // Отправляем сообщение КАЖДОМУ ID из списка
    for (const chatId of chatIds) {
      if (!chatId) continue;

      const form = new FormData();
      form.append('chat_id', chatId);
      form.append('caption', caption);
      form.append('parse_mode', 'HTML');
      
      const blob = new Blob([imageBuffer], { type: 'image/png' });
      form.append('photo', blob, 'signature.png');

      const response = await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
        method: 'POST',
        body: form
      });

      const result = await response.json();
      
      if (result.ok) {
        successCount++;
      } else {
        console.error(`Ошибка отправки на ID ${chatId}:`, result.description);
        lastError = result.description;
      }
    }

    // Если хотя бы одно сообщение доставлено, считаем это успехом
    if (successCount > 0) {
      res.status(200).json({ ok: true });
    } else {
      res.status(400).json({ ok: false, message: lastError || 'Не удалось отправить ни одного сообщения.' });
    }

  } catch (error) {
    console.error("Backend Error:", error);
    res.status(500).json({ ok: false, message: error.message });
  }
}
