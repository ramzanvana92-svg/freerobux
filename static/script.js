let currentStage = 0, timerInterval = null, pupilInterval = null;

async function fetchStage() {
    const res = await fetch('/api/stage');
    const data = await res.json();
    currentStage = data.stage;
    if (currentStage === 1 && data.timer_start) showTimerStage(data.timer_start);
    else if (currentStage === 2) showPersonalStage();
    else if (currentStage === 3) showFinalStage();
}

// === КНОПКА (работает и на телефоне) ===
document.addEventListener('DOMContentLoaded', function() {
    const btn = document.getElementById('buyBtn');
    if (btn) {
        btn.addEventListener('click', async function(e) {
            e.preventDefault();
            if (currentStage > 0) return;
            await fetch('/api/buy', { method: 'POST' });
            currentStage = 1;
            showBlackEyes();
            setTimeout(() => {
                document.removeEventListener('mousemove', trackEyes);
                document.removeEventListener('touchmove', trackEyesTouch);
                clearInterval(pupilInterval);
                showTimerStage(new Date().toISOString());
            }, 5000);
        });
        // Для телефонов — дополнительно вешаем на touchstart
        btn.addEventListener('touchstart', function(e) {
            if (currentStage > 0) return;
            this.click();
        });
    }
});

// === ЧЁРНЫЙ ЭКРАН ===
function showBlackEyes() {
    document.getElementById('mainPage').style.display = 'none';
    const screen = document.getElementById('blackScreen');
    screen.classList.add('active');
    document.addEventListener('mousemove', trackEyes);
    document.addEventListener('touchmove', trackEyesTouch, { passive: false });
    setTimeout(() => startPupilDilation(), 4000);
}

// === ТРЕКИНГ ДЛЯ МЫШИ ===
function trackEyes(e) {
    const x = e.clientX, y = e.clientY;
    movePupils(x, y);
}

// === ТРЕКИНГ ДЛЯ ПАЛЬЦА ===
function trackEyesTouch(e) {
    e.preventDefault();
    if (e.touches.length > 0) {
        const x = e.touches[0].clientX;
        const y = e.touches[0].clientY;
        movePupils(x, y);
    }
}

// === ОБЩАЯ ФУНКЦИЯ ДВИЖЕНИЯ ЗРАЧКОВ ===
function movePupils(x, y) {
    document.querySelectorAll('.pupil').forEach(p => {
        const rect = p.parentElement.getBoundingClientRect();
        const cx = rect.left + rect.width/2;
        const cy = rect.top + rect.height/2;
        let dx = x - cx, dy = y - cy;
        const maxDist = 30, dist = Math.sqrt(dx*dx + dy*dy);
        if (dist > maxDist) { dx = dx/dist * maxDist; dy = dy/dist * maxDist; }
        p.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    });
}

// === РАСШИРЕНИЕ ЗРАЧКОВ ===
function startPupilDilation() {
    let size = 20;
    pupilInterval = setInterval(() => {
        size += 1.8;
        if (size > 130) {
            clearInterval(pupilInterval);
            document.body.innerHTML = '<div style="color:#fff;font-size:40px;text-align:center;margin-top:40vh;">EXCEPTION: SOUL_OVERFLOW</div>';
            setTimeout(() => location.reload(), 1500);
            return;
        }
        document.querySelectorAll('.pupil').forEach(p => {
            p.style.width = size + 'px';
            p.style.height = size + 'px';
        });
    }, 120);
}

// === ТАЙМЕР ===
function showTimerStage(timerStart) {
    document.getElementById('stageMsg').textContent = 'ВЫ УЖЕ СДЕЛАЛИ ЭТОТ ВЫБОР. ВСПОМНИТЕ.';
    document.getElementById('stageMsg').classList.add('show');
    const timerDisplay = document.getElementById('timerDisplay');
    timerDisplay.classList.add('show');
    document.getElementById('eyeText').style.display = 'none';
    const start = new Date(timerStart).getTime();
    let remaining = 600 - Math.floor((Date.now() - start) / 1000);
    if (remaining < 0) remaining = 0;
    updateTimer(remaining);
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        let rem = 600 - Math.floor((Date.now() - start) / 1000);
        if (rem < 0) rem = 0;
        updateTimer(rem);
        if (rem === 0) {
            clearInterval(timerInterval);
            document.getElementById('stageMsg').textContent = 'ВРЕМЯ ВЫШЛО. ТЫ ВИДИШЬ МЕНЯ.';
            setTimeout(async () => {
                const res = await fetch('/api/final');
                const data = await res.json();
                showFinalStage(data.message);
            }, 2000);
        }
    }, 1000);
}

function updateTimer(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    document.getElementById('timerDisplay').textContent = `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

// === ПЕРСОНАЛЬНАЯ ФАЗА ===
function showPersonalStage() {
    document.getElementById('stageMsg').textContent = 'ТЫ ДУМАЛ, ЭТО ПРОСТО САЙТ?';
    document.getElementById('stageMsg').classList.add('show');
    const input = document.getElementById('hiddenInput');
    input.style.display = 'block';
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

// === ФИНАЛ ===
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

// === ЗАПУСК ===
fetchStage();
