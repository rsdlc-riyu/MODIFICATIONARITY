import os
import wave
import numpy as np
import tensorflow as tf
import uuid
import threading
import librosa
import serial 
import pyaudio
import queue
from datetime import datetime
from flask import Flask, jsonify, render_template, request, Response, send_file, redirect, url_for, make_response
from flask_cors import CORS
from flask_socketio import SocketIO
from sqlalchemy import create_engine, Column, Integer, String, DateTime
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from reportlab.pdfgen import canvas
from arduino_serial import send_command_to_arduino

app = Flask(__name__, static_url_path='/static')
socketio = SocketIO(app, cors_allowed_origins='*')
CORS(app)

Base = declarative_base()

class HistoryLog(Base):
    __tablename__ = 'history_log'
    id = Column(Integer, primary_key=True, autoincrement=True)
    datetime = Column(DateTime, nullable=False)
    distress_type = Column(String, nullable=False)

engine = create_engine('sqlite:///distress_history.db', echo=True)
Base.metadata.create_all(engine)
Session = sessionmaker(bind=engine)
db_session = Session()

# Global variables
serial_port = 'COM5'
baud_rate = 9600
audio_queue = queue.Queue()
model_path = 'ChicDistressVocalizations3rdTry.h5'
model = tf.keras.models.load_model(model_path)
lock = threading.Lock()

classes = {
    0: "Normal",
    1: "Chicken is Disturbed",
    2: "Chicken is in Danger",
    3: "Chicken is Threatened",
}

distress_counts = {
    "Chicken is Disturbed": 0,
    "Chicken is in Danger": 0,
    "Chicken is Threatened": 0
}

CHUNK_SIZE = 1024
FORMAT = pyaudio.paInt16
CHANNELS = 1
RATE = 44100
MAX_FRAMES = 38

def extract_features(audio_data):
    audio_data = np.frombuffer(audio_data, dtype=np.int16) / 32768.0
    temp_dir = 'temp_files'
    os.makedirs(temp_dir, exist_ok=True)
    temp_path = os.path.join(temp_dir, f'temp_{uuid.uuid4().hex}.wav')
    with wave.open(temp_path, 'wb') as wf:
        wf.setnchannels(CHANNELS)
        wf.setsampwidth(2)
        wf.setframerate(RATE)
        wf.writeframes(audio_data.tobytes())

    audio, _ = librosa.load(temp_path, sr=RATE)
    os.remove(temp_path)

    mfcc_features = librosa.feature.mfcc(y=audio, sr=RATE, n_mfcc=20, n_fft=1024)
    
    if mfcc_features.shape[1] < MAX_FRAMES:
        mfcc_features = np.pad(mfcc_features, ((0, 0), (0, MAX_FRAMES - mfcc_features.shape[1])), mode='constant')
    else:
        mfcc_features = mfcc_features[:, :MAX_FRAMES]
    
    mfcc_features = (mfcc_features - np.mean(mfcc_features)) / np.std(mfcc_features)
    mfcc_features = mfcc_features[np.newaxis, ..., np.newaxis]
    return mfcc_features


def predict_distress(audio_data):
    features = extract_features(audio_data)
    prediction = model.predict(features)
    predicted_label = np.argmax(prediction)
    predicted_class = classes[predicted_label]
    return predicted_class

def capture_audio_data(duration=10):
    global audio_queue
    p = pyaudio.PyAudio()
    stream = p.open(format=FORMAT,
                    channels=CHANNELS,
                    rate=RATE,
                    input=True,
                    frames_per_buffer=CHUNK_SIZE)
    data_duration = int(RATE / CHUNK_SIZE * duration)
    for i in range(data_duration):
        data = stream.read(CHUNK_SIZE)
        audio_queue.put(data)
    stream.stop_stream()
    stream.close()
    p.terminate()


@app.route('/audio_feed')
def audio_feed():
    def generate_audio():
        for chunk in capture_audio_data():
            yield chunk
    return Response(generate_audio(), mimetype='audio/x-wav')

@app.route('/')
def home():
    return render_template('index.html')

def emit_updated_distress_counts():
    filtered_distress_counts = {key: value for key, value in distress_counts.items() if key not in ["Normal", "Background Noise"]}
    socketio.emit('distress_counts', filtered_distress_counts)
    print("Emitted updated distress counts:", filtered_distress_counts)

@app.route('/classify', methods=['POST'])
def classify_audio():
    data = request.get_json()
    audio_data = data.get('audio_data')
    distress_type = None
    with lock:
        audio_thread = threading.Thread(target=capture_audio_data, args=(5,))
        audio_thread.start()
        audio_thread.join()

        frames = []
        while not audio_queue.empty():
            data = audio_queue.get()
            frames.append(data)

        full_audio_data = b''.join(frames)
        distress_type = predict_distress(full_audio_data)
        print("Predicted Distress Type:", distress_type)

        if distress_type != "Normal" and distress_type != "Background Noise":
            distress_counts[distress_type] += 1
            history_log = HistoryLog(
                datetime=datetime.now(),
                distress_type=distress_type,
            )
            db_session.add(history_log)

            try:
                db_session.commit()
                socketio.emit('new_history_log', {
                    'id': history_log.id,
                    'date': history_log.datetime.strftime('%Y-%m-%d'),
                    'time': history_log.datetime.strftime('%H:%M:%S'),
                    'distress_type': history_log.distress_type
                }, namespace='/')

                emit_updated_distress_counts()
                emit_updated_distress_date(history_log)

                # Send command to Arduino
                if distress_type == "Chicken is Disturbed":
                    send_command_to_arduino("DistressType1")
                elif distress_type == "Chicken is in Danger":
                    send_command_to_arduino("DistressType2")
                elif distress_type == "Chicken is Threatened":
                    send_command_to_arduino("DistressType3")

            except Exception as e:
                print("Error while saving distress log:", e)
                db_session.rollback()

    return jsonify(distress_type)

# Emit date
def emit_updated_distress_date(history_log):
    socketio.emit('distress_date', {
        'date': history_log.datetime.strftime('%Y-%m-%d'),
    })
    print("Emitted updated distress counts:", history_log.datetime.strftime('%Y-%m-%d'))


def generate_pdf(history_log):
    pdf_file = "distress_logs.pdf"
    c = canvas.Canvas(pdf_file)
    c.drawString(72, 800, "History Logs")
    y = 750
    for log in history_log:
        c.drawString(72, y, f"Date and Time: {log.datetime} Distress Type: {log.distress_type}")
        y -= 20
    c.save()
    return pdf_file

@app.route('/history_log', methods=['GET', 'POST'])
def history_log():
    search_query = request.form.get('query')
    if search_query:
        search_results = HistoryLog.query.filter(
            (HistoryLog.distress_type.ilike(f'%{search_query}%')) |
            (HistoryLog.datetime.ilike(f'%{search_query}%'))
        ).all()
        count = len(search_results)

        if count > 0:
            return render_template('index.html', search_results=search_results, search_query=search_query,
                                   count=count)
        else:
            return render_template('index.html', no_results=True, search_query=search_query)
    else:
        history_log = HistoryLog.query.order_by(HistoryLog.id.desc()).all()
        return render_template('index.html', history_log=history_log)

@app.route('/delete_log/<int:log_id>', methods=['POST'])
def delete_log(log_id):
    log = HistoryLog.query.get(log_id)
    if log:
        db_session.delete(log)
        db_session.commit()

@app.route('/search_logs', methods=['POST'])
def search_logs():
    search_query = request.form.get('query')
    if search_query:
        search_results = HistoryLog.query.filter(
            (HistoryLog.distress_type.ilike(f'%{search_query}%')) |
            (HistoryLog.datetime.ilike(f'%{search_query}%'))
        ).all()
        result_data = {
            'search_results': [
                {
                    'id': log.id,
                    'date': log.datetime.strftime('%Y-%m-%d'),
                    'time': log.datetime.strftime('%H:%M:%S'),
                    'distress_type': log.distress_type,
                }
                for log in search_results
            ],
        }
        return jsonify(result_data)
    else:
        return jsonify({'search_results': []})

@app.route('/clear_logs', methods=['POST'])
def clear_logs():
    HistoryLog.query.delete()
    db_session.commit()
    return jsonify({'status': 'success'})

@app.route('/download_pdf', methods=['POST'])
def download_pdf():
    from_date_str = request.form.get('from_date')
    to_date_str = request.form.get('to_date')

    from_date = datetime.strptime(from_date_str, '%Y-%m-%d').date()
    to_date = datetime.strptime(to_date_str, '%Y-%m-%d').date()

    history = HistoryLog.query.filter(HistoryLog.datetime.between(from_date, to_date)).all()

    pdf_buffer = generate_pdf(history)

    response = make_response(pdf_buffer)
    response.headers['Content-Type'] = 'application/pdf'
    response.headers['Content-Disposition'] = 'attachment; filename=distress_logs.pdf'

    return response


if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5000)
