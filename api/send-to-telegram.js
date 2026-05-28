// Отправка формы
      const form = document.getElementById('frosthaven-form');
      const submitBtn = document.getElementById('submitBtn');
      const statusBox = document.getElementById('status');

      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (document.getElementById('website').value !== '') return; // Антиспам
        
        if (!isSigned) {
          alert("Договор недействителен без вашей подписи! Пожалуйста, распишитесь на документе."); return;
        }

        submitBtn.disabled = true;
        submitBtn.innerHTML = 'Отправка...';
        statusBox.className = 'status-box';

        // Генерируем картинку подписи
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = signaturePad.width;
        tempCanvas.height = signaturePad.height;
        const tCtx = tempCanvas.getContext('2d');
        tCtx.fillStyle = '#f3e9d2'; // Цвет бумаги
        tCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
        tCtx.drawImage(signaturePad, 0, 0);
        
        const signatureDataURL = tempCanvas.toDataURL('image/png');

        const data = {
          nickname: document.getElementById('nickname').value.trim(),
          date: document.getElementById('date').value,
          job: document.querySelector('[name="job"]:checked')?.value || '',
          extraJobs: Array.from(document.querySelectorAll('[name="extraJob"]:checked')).map(el => el.value),
          time: document.getElementById('time').value.trim(),
          contact: document.getElementById('contact').value.trim(),
          about: document.getElementById('about').value.trim(),
          signature: signatureDataURL
        };

        try {
          // Умный выбор API-пути (избегает ошибок CORS если оба файла лежат на одном сайте)
          const apiUrl = window.location.hostname.includes('vercel.app') 
            ? '/api/send-to-telegram' 
            : 'https://frost-heaven-citywork.vercel.app/api/send-to-telegram';

          const res = await fetch(apiUrl, {
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify(data)
          });
          
          // Читаем ответ сервера, даже если произошла ошибка, чтобы получить её текст
          const result = await res.json().catch(() => ({}));
          
          if (!res.ok || result.ok === false) {
            throw new Error(result.message || 'Сервер недоступен. Проверьте логи Vercel.');
          }

          statusBox.className = 'status-box ok';
          statusBox.textContent = '✔️ Договор подписан и заявка успешно доставлена в Мэрию!';
          form.reset(); ctxPad.clearRect(0, 0, signaturePad.width, signaturePad.height); isSigned = false;
          submitBtn.innerHTML = 'Успешно';
          
          setTimeout(() => {
            submitBtn.disabled = false; submitBtn.innerHTML = 'Подписать и Отправить';
            statusBox.style.display = 'none'; prevStep(4); prevStep(3); prevStep(2); 
          }, 6000);

        } catch (err) {
          statusBox.className = 'status-box err';
          statusBox.textContent = '❌ ' + err.message;
          submitBtn.disabled = false; submitBtn.innerHTML = 'Повторить отправку';
        }
      });
