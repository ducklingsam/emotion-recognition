from flask import Flask, request, jsonify
from flask_cors import CORS
import cv2
import numpy as np
from keras.models import model_from_json
import logging
from dotenv import load_dotenv

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})
app.config['CORS_HEADERS'] = 'Content-Type'

load_dotenv()

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

        # Image decoding
        in_memory_file = np.frombuffer(file.read(), np.uint8)
        image = cv2.imdecode(in_memory_file, cv2.IMREAD_GRAYSCALE)
        logging.info("Image decoded successfully")

        # Face detection
        faces = face_cascade.detectMultiScale(image, 1.3, 5)
        if len(faces) == 0:
            return jsonify({'status': 'No faces detected'}), 200
        logging.info(f"Faces detected:{len(faces)}")

        # Emotion prediction
        emotions = []
        for (p, q, r, s) in faces:
            face_img = image[q:q + s, p:p + r]
            face_img = cv2.resize(face_img, (48, 48))
            img = extract_features(face_img)
            pred = model.predict(img)
            prediction_label = labels[pred.argmax()]
            emotions.append({"emotion": prediction_label, "box": [int(p), int(q), int(r), int(s)]})

        # Log the emotions detected
        logging.info(f"Emotions detected: {emotions}")

        # Send the response
        response = jsonify(emotions)
        response.headers.add("Access-Control-Allow-Origin", "*")
        response.headers.add("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        response.headers.add("Access-Control-Allow-Headers", "Content-Type,Authorization")
        return response
    except Exception as e:
        logging.info(f"Error processing the image: {str(e)}")
        return jsonify({'error': 'Failed to process the image', 'message': str(e)}), 500


if __name__ == '__main__':
    app.run(debug=True)
