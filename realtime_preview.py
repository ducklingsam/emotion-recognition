from flask import Flask, request, jsonify
from flask_cors import CORS
import cv2
import numpy as np
from keras.models import model_from_json
import os
from dotenv import load_dotenv
from flask_httpauth import HTTPBasicAuth
from werkzeug.security import check_password_hash, generate_password_hash
import psycopg2
from datetime import datetime, timedelta

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})
app.config['CORS_HEADERS'] = 'Content-Type'

auth = HTTPBasicAuth()

load_dotenv()

DB_NAME = os.getenv("DB_NAME")
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")
DB_HOST = os.getenv("DB_HOST")
DB_PORT = os.getenv("DB_PORT")


def get_db_connection():
    conn = psycopg2.connect(
        dbname=DB_NAME,
        user=DB_USER,
        password=DB_PASSWORD,
        host=DB_HOST,
        port=DB_PORT
    )
    return conn


def update_user_info(username, user_info):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE users SET user_info = %s WHERE username = %s", (user_info, username))
    conn.commit()
    cursor.close()
    conn.close()


@auth.verify_password
def verify_password(username, password):
    origin = request.headers.get('Origin')
    referer = request.headers.get('Referer')

    if origin == 'http://localhost:63342' or (referer and referer.startswith('http://localhost:63342')):
        return True

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT password, user_info FROM users WHERE username = %s", (username,))
    user = cursor.fetchone()
    cursor.close()
    conn.close()

    if user:
        stored_password, user_info = user
        user_info = user_info or {}
        is_first_week = user_info.get('is_first_week', False)
        purchase_time_str = user_info.get('purchase', None)
        if purchase_time_str:
            purchase_time = datetime.fromisoformat(purchase_time_str)
            current_time = datetime.now()

            if is_first_week:
                if (current_time - purchase_time).days > 7:
                    is_first_week = False
                    user_info['is_first_week'] = False
                    update_user_info(username, user_info)
                else:
                    if check_password_hash(stored_password, password):
                        return username
            else:
                if (current_time - purchase_time).days > 30:
                    return None
                else:
                    if check_password_hash(stored_password, password):
                        return username

    return None


# Load model
json_file = open("model/emotion_recognition.json", "r")
model_json = json_file.read()
json_file.close()
model = model_from_json(model_json)
model.load_weights("model/emotion_recognition.h5")

haar_file = cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
face_cascade = cv2.CascadeClassifier(haar_file)

labels = {
    0: 'angry',
    1: 'disgust',
    2: 'fear',
    3: 'happy',
    4: 'neutral',
    5: 'sad',
    6: 'surprise'
}


def extract_features(image):
    feature = np.array(image)
    feature = feature.reshape(1, 48, 48, 1)
    return feature / 255.0


@app.route('/api/status', methods=['GET'])
def check_system_status():
    return jsonify({'status': 'System is available'}), 200


@app.route('/api/predict', methods=['POST', 'OPTIONS'])
@auth.login_required
def predict_emotion():
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add("Access-Control-Allow-Origin", "*")
        response.headers.add("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        response.headers.add("Access-Control-Allow-Headers", "Content-Type,Authorization")
        return response

    try:
        file = request.files['image']
        if not file:
            return jsonify({'error': 'No file uploaded'}), 400

        in_memory_file = np.frombuffer(file.read(), np.uint8)
        image = cv2.imdecode(in_memory_file, cv2.IMREAD_GRAYSCALE)
        print("Image decoded successfully")

        faces = face_cascade.detectMultiScale(image, 1.3, 5)
        if len(faces) == 0:
            return jsonify({'status': 'No faces detected'}), 200
        print(f"Faces detected:{len(faces)}")

        emotions = []
        for (p, q, r, s) in faces:
            face_img = image[q:q + s, p:p + r]
            face_img = cv2.resize(face_img, (48, 48))
            img = extract_features(face_img)
            pred = model.predict(img)
            prediction_label = labels[pred.argmax()]
            emotions.append({"emotion": prediction_label, "box": [int(p), int(q), int(r), int(s)]})

        print(f"Emotions detected: {emotions}")

        response = jsonify(emotions)
        response.headers.add("Access-Control-Allow-Origin", "*")
        response.headers.add("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        response.headers.add("Access-Control-Allow-Headers", "Content-Type,Authorization")
        return response
    except Exception as e:
        print(f"Error processing the image: {str(e)}")
        return jsonify({'error': 'Failed to process the image', 'message': str(e)}), 500


if __name__ == '__main__':
    app.run(debug=True)
