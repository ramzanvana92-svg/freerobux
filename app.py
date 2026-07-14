from flask import Flask, render_template, request, jsonify, session
import sqlite3
import datetime
import random
import string

app = Flask(__name__)
app.secret_key = ''.join(random.choices(string.ascii_letters, k=24))
DB_PATH = 'sessions.db'

# === СОЗДАНИЕ БАЗЫ ДАННЫХ ПРИ ЗАПУСКЕ ===
def init_db():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ip TEXT,
        user_agent TEXT,
        stage INTEGER DEFAULT 0,
        first_visit TIMESTAMP,
        timer_start TIMESTAMP,
        input_text TEXT
    )''')
    conn.commit()
    conn.close()

# ВЫЗЫВАЕМ СРАЗУ
init_db()

# === ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ===
def get_user():
    user_id = session.get('user_id')
    if not user_id:
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        c.execute('INSERT INTO users (ip, user_agent, first_visit) VALUES (?, ?, ?)',
                  (request.remote_addr, request.headers.get('User-Agent'), datetime.datetime.now()))
        conn.commit()
        user_id = c.lastrowid
        session['user_id'] = user_id
        conn.close()
    return user_id

# === МАРШРУТЫ ===
@app.route('/')
def index():
    get_user()
    return render_template('index.html')

@app.route('/api/stage')
def get_stage():
    user_id = get_user()
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('SELECT stage, timer_start FROM users WHERE id=?', (user_id,))
    row = c.fetchone()
    conn.close()
    if row:
        stage = row[0]
        timer_start = row[1]
        if stage == 1 and timer_start:
            elapsed = (datetime.datetime.now() - datetime.datetime.fromisoformat(timer_start)).total_seconds()
            if elapsed >= 600:
                conn = sqlite3.connect(DB_PATH)
                c = conn.cursor()
                c.execute('UPDATE users SET stage=2 WHERE id=?', (user_id,))
                conn.commit()
                conn.close()
                stage = 2
        return jsonify({'stage': stage, 'timer_start': timer_start})
    return jsonify({'stage': 0})

@app.route('/api/buy', methods=['POST'])
def buy():
    user_id = get_user()
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('UPDATE users SET stage=1, timer_start=? WHERE id=?',
              (datetime.datetime.now().isoformat(), user_id))
    conn.commit()
    conn.close()
    return jsonify({'status': 'ok'})

@app.route('/api/save_input', methods=['POST'])
def save_input():
    user_id = get_user()
    data = request.get_json()
    text = data.get('text', '')
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('UPDATE users SET input_text=?, stage=3 WHERE id=?', (text, user_id))
    conn.commit()
    conn.close()
    return jsonify({'status': 'ok'})

@app.route('/api/final')
def final():
    user_id = get_user()
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('SELECT input_text, ip FROM users WHERE id=?', (user_id,))
    row = c.fetchone()
    conn.close()
    if row:
        input_text = row[0] or 'пустота'
        msg = f'Ты написал: "{input_text[:50]}..." Но я знаю больше. Ты уже чувствуешь это.'
        return jsonify({'message': msg})
    return jsonify({'message': 'ТЫ УЖЕ ЗНАЕШЬ ПРАВДУ.'})

# === ЗАПУСК ===
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=10000)
