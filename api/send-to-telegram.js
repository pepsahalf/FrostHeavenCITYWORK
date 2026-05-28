export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  
  const { nickname, date, job, extraJobs, time, contact, about, signature } = req.body;

  
  const caption = `
📜 <b>НОВЫЙ ДОГОВОР: ФРОСТХЕВЕН</b> 📜

👤 <b>Ник:</b> ${nickname}
📅 <b>Дата захода:</b> ${date}
📞 <b>Связь:</b> ${contact}
⏱ <b>Прайм-тайм:</b> ${time}

⚙️ <b>Профессия:</b> ${job}
🔧 <b>Доп. роли:</b> ${extraJobs.length > 0 ? extraJobs.join(', ') : 'Нет'}

💬 <b>Мотивация:</b> 
<i>"${about}"</i>
`;

  try {
    
    const base64Data = signature.replace(/^data:image\/\w+;base64,/, "");
    
    const imageBuffer = Buffer.from(base64Data, 'base64');

    
    const form = new FormData();
    form.append('chat_id', chatId);
    form.append('caption', caption);
    form.append('parse_mode', 'HTML');
    form.append('photo', new Blob([imageBuffer], { type: 'image/png' }), 'signature.png');

    
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
      method: 'POST',
      body: form
    });

    const result = await response.json();

    if (result.ok) {
      res.status(200).json({ ok: true });
    } else {
      res.status(400).json({ ok: false, message: result.description });
    }
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message });
  }
}
