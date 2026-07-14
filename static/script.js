input.focus();
    let timeout = setTimeout(() => {
        if (!input.value.trim()) {
            input.style.display = 'none';
            document.getElementById('stageMsg').innerHTML = 'ХОРОШО. Я СКАЖУ САМ.';
            setTimeout(async () => {
                const res = await fetch('/api/final');
                const data = await res.json();
                showFinalStage(data.message);
            }, 5000);
        }
    }, 15000);
    input.addEventListener('input', function() {
        clearTimeout(timeout);
        if (this.value.length > 3) {
            this.style.display = 'none';
            document.getElementById('stageMsg').innerHTML = 'ЭТО НЕ ШУТКА.';
            setTimeout(async () => {
                await fetch('/api/save_input', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({text: this.value}) });
                const res = await fetch('/api/final');
                const data = await res.json();
                showFinalStage(data.message);
            }, 2000);
        }
    });
}

function showFinalStage(msg) {
    document.getElementById('stageMsg').innerHTML = msg + '<br><br>ЗАКРОЙ ВКЛАДКУ — И Я ПОЯВЛЮСЬ В ТВОЁМ СНЕ.';
    document.getElementById('stageMsg').classList.add('show');
    document.getElementById('eyeText').style.display = 'none';
    document.getElementById('hiddenInput').style.display = 'none';
    const btn = document.createElement('button');
    btn.textContent = 'ПРОСТИ';
    btn.style.cssText = 'background:#fff;color:#000;border:none;padding:15px 40px;font-size:24px;border-radius:8px;cursor:pointer;margin-top:30px;';
    btn.onclick = () => window.location.href = 'https://www.google.com';
    document.getElementById('blackScreen').appendChild(btn);
}

fetchStage();