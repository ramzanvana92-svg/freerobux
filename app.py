from flask import Flask, render_template, request, jsonify, session, send_file
import sqlite3
import datetime
import json
import os
import random
import string

app = Flask(__name__)
app.secret_key = ''.join(random.choices(string.ascii_letters, k=24))

DB_PATH = 'sessions.db'

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
        input_text TEXT,
        fear_score INTEGER DEFAULT 0
    )''')
    conn.commit()
    conn.close()

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

@app.route('/')
def index():
    get_user()
    return render_template('index.html')

@app.route('/api/stage', methods=['GET'])
def get_stage():
    user_id = get_user()
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('SELECT stage, timer_start, first_visit FROM users WHERE id=?', (user_id,))
    row = c.fetchone()
    conn.close()
    if row:
        stage = row[0]
        timer_start = row[1]
        first_visit = row[2]
        # если stage = 1 (таймер) и 10 минут прошло — переводим на stage 2
        if stage == 1 and timer_start:
            elapsed = (datetime.datetime.now() - datetime.datetime.fromisoformat(timer_start)).total_seconds()
            if elapsed >= 600:  # 10 минут
                conn = sqlite3.connect(DB_PATH)
                c = conn.cursor()
                c.execute('UPDATE users SET stage=2 WHERE id=?', (user_id,))
                conn.commit()
                conn.close()
                stage = 2
        return jsonify({'stage': stage, 'timer_start': timer_start, 'first_visit': first_visit})
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
    return jsonify({'status': 'ok', 'stage': 1})

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

@app.route('/api/final', methods=['GET'])
def final():
    user_id = get_user()
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('SELECT input_text, ip, first_visit FROM users WHERE id=?', (user_id,))
    row = c.fetchone()
    conn.close()
    if row:
        input_text = row[0] or 'пустота'
        ip = row[1]
        # персональная фраза на основе ввода
        if 'страх' in input_text.lower() or 'боюсь' in input_text.lower():
            msg = 'Ты боишься именно этого — потери контроля. Но контроль уже утерян.'
        elif 'шутка' in input_text.lower():
            msg = 'Это не шутка. Ты уже чувствуешь это. Скажи вслух, что ты видишь сейчас.'
        else:
            msg = f'Ты написал: "{input_text[:50]}..." Но я знаю больше. Ты думал, что это просто сайт. Ты ошибся.'
        return jsonify({'message': msg, 'ip': ip})
    return jsonify({'message': 'ТЫ УЖЕ ЗНАЕШЬ ПРАВДУ.'})

if name == 'main':
    init_db()
    app.run(debug=True, host='0.0.0.0', port=5000)
