// scripts.js
document.addEventListener('DOMContentLoaded', function() {
    checkSystemStatus();
});

let webcamActive = false;

const fileInput = document.getElementById('fileInput');
const customFileButton = document.getElementById('customFileButton');
const sendButton = document.getElementById('sendButton');
const preview = document.getElementById('preview');

customFileButton.addEventListener('click', function() {
    fileInput.click();
});

fileInput.addEventListener('change', function() {
    if (fileInput.files.length > 0) {
        sendButton.style.display = 'inline-block';

        const file = fileInput.files[0];
        const reader = new FileReader();
        reader.onload = function(e) {
            preview.innerHTML = `<img src="${e.target.result}" style="max-width: 200px; max-height: 200px;" />`; // Создание превью изображения
        };
        reader.readAsDataURL(file);
    }
});


async function checkSystemStatus() {
    try {
        const response = await fetch('http://127.0.0.1:5000/api/status');
        const data = await response.json();
        const statusDiv = document.getElementById('status');
        if (response.ok) {
            statusDiv.textContent = data.status;
            statusDiv.className = 'green';
            statusDiv.classList.remove('blink');
            setTimeout(function() {
                statusDiv.style.display = 'none';
                document.getElementById('mainInterface').style.display = 'block';
            }, 3000);
        } else {
            statusDiv.textContent = 'System is unavailable';
            statusDiv.className = 'red blink';
            document.getElementById('mainInterface').style.display = 'none';
        }
    } catch (error) {
        const statusDiv = document.getElementById('status');
        statusDiv.textContent = 'System is unavailable';
        statusDiv.className = 'red blink';
        console.error('Ошибка при проверке статуса:', error);
    }
}




async function uploadImage() {
    const fileInput = document.getElementById('fileInput');
    const file = fileInput.files[0];
    const uploadStatusDiv = document.getElementById('uploadStatus');
    const loader = document.getElementById('loader');

    if (file) {
        const formData = new FormData();
        formData.append('image', file);

        loader.style.display = 'block';
        uploadStatusDiv.style.display = 'none';

        try {
            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });
            if (response.ok) {
                setTimeout(() => {
                    loader.style.display = 'none';
                    displayServerResponse(response);
                }, 5000);
            } else {
                throw new Error('Сервер вернул ошибку');
            }
        } catch (error) {
            loader.style.display = 'none';
            uploadStatusDiv.textContent = 'Uploading error';
            uploadStatusDiv.style.display = 'block';
            console.error('Uploading error:', error);
            setTimeout(() => {
                uploadStatusDiv.style.display = 'none';
            }, 15000);
        }
    } else {
        alert('Choose file.');
    }
}

function displayServerResponse(response) {
    response.text().then(text => {
        const responseDiv = document.createElement('div');
        responseDiv.textContent = text;
        responseDiv.style.backgroundColor = 'white';
        responseDiv.style.color = 'black';
        responseDiv.style.padding = '10px';
        responseDiv.style.margin = 'auto';
        document.body.appendChild(responseDiv);
    });
}

document.getElementById('sendButton').addEventListener('click', uploadImage);


async function toggleWebcam() {
    const video = document.querySelector('video');
    const button = document.getElementById('webcamButton');
    if (!webcamActive) {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        video.srcObject = stream;
        webcamActive = true;
        button.textContent = 'Turn off Webcam';

        const intervalId = setInterval(() => {
            sendFrameToServer(video);
        }, 1000);

        // Сохраняем ID интервала для возможности его остановки
        video.setAttribute('data-interval-id', intervalId);
        emotionsContainer.style.display = 'block';
    } else {
        const intervalId = video.getAttribute('data-interval-id');
        clearInterval(intervalId);  // Остановка отправки кадров

        video.srcObject.getTracks().forEach(track => track.stop());
        video.srcObject = null;
        webcamActive = false;
        button.textContent = 'Turn on Webcam';
        emotionsContainer.style.display = 'none';
    }
}


async function sendFrameToServer(video) {
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(async blob => {
        const formData = new FormData();
        formData.append('image', blob);
        try {
            const response = await fetch('http://127.0.0.1:5000/api/predict', {
                method: 'POST',
                body: formData
            });
            const data = await response.json();
            if (data && data.length > 0) {
                const emotionsContainer = document.getElementById('emotionsContainer');
                emotionsContainer.innerHTML = '';
                data.forEach(detected => {
                    console.log('Detected emotion:', detected.emotion);
                    const emotionDiv = document.createElement('div');
                    emotionDiv.textContent = `Seems like, you are ${detected.emotion}`;
                    emotionDiv.style.backgroundColor = 'white';
                    emotionDiv.style.color = 'black';
                    emotionDiv.style.padding = '10px';
                    emotionDiv.style.marginTop = '10px';
                    emotionsContainer.appendChild(emotionDiv);
                });
            }
        } catch (error) {
            console.error('Error sending frame:', error);
        }
    });
}


