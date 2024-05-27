from flask import Flask, request, jsonify
from flask_cors import CORS
import cv2
import numpy as np
from keras.models import model_from_json

app = Flask(__name__)
CORS(app, methods=['GET', 'POST'])

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
    if model and face_cascade:
        return jsonify({'status': 'System is available'}), 200
    else:
        return jsonify({'status': 'System is unavailable'}), 503


@app.route('/api/predict', methods=['POST'])
def predict_emotion():
    try:
        file = request.files['image']
        in_memory_file = np.frombuffer(file.read(), np.uint8)
        image = cv2.imdecode(in_memory_file, cv2.IMREAD_GRAYSCALE)
    except Exception as e:
        return jsonify({'error': 'Failed to process the image', 'message': str(e)}), 400

    faces = face_cascade.detectMultiScale(image, 1.3, 5)
    emotions = []
    for (p, q, r, s) in faces:
        face_img = image[q:q + s, p:p + r]
        face_img = cv2.resize(face_img, (48, 48))
        img = extract_features(face_img)
        pred = model.predict(img)
        prediction_label = labels[pred.argmax()]
        emotions.append({"emotion": prediction_label, "box": [int(p), int(q), int(r), int(s)]})
    return jsonify(emotions)


if __name__ == '__main__':
    app.run(debug=True)
