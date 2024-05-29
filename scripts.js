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
        const response = await fetch('https://emotion-recognition-0jl7.onrender.com/api/status');
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
    const formData = new FormData();
    formData.append('image', file);

    const loader = document.getElementById('loader');
    loader.style.display = 'block';

    try {
        const response = await fetch('https://emotion-recognition-0jl7.onrender.com/api/predict', {
            method: 'POST',
            body: formData
        });
        if (response.ok) {
            const data = await response.json();
            displayEmotions(data);
        } else {
            console.error('Ошибка при отправке файла');
        }
    } catch (error) {
        console.error('Ошибка при отправке файла:', error);
    } finally {
        loader.style.display = 'none';
    }
}

function displayEmotions(emotions) {
    const emotionsContainerPhoto = document.getElementById('emotionsContainerPhoto');
    emotionsContainerPhoto.innerHTML = '';

    emotions.forEach(emotion => {
        const emotionDiv = document.createElement('div');
        emotionDiv.textContent = `Emotion: ${emotion.emotion}`;
        emotionDiv.style.backgroundColor = 'white';
        emotionDiv.style.color = 'black';
        emotionDiv.style.padding = '10px';
        emotionDiv.style.marginTop = '10px';
        emotionsContainerPhoto.appendChild(emotionDiv);
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

        video.setAttribute('data-interval-id', intervalId);
        emotionsContainerVideo.style.display = 'block';
    } else {
        const intervalId = video.getAttribute('data-interval-id');
        clearInterval(intervalId);

        video.srcObject.getTracks().forEach(track => track.stop());
        video.srcObject = null;
        webcamActive = false;
        button.textContent = 'Turn on Webcam';
        emotionsContainerVideo.style.display = 'none';
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
            const response = await fetch('https://emotion-recognition-0jl7.onrender.com/api/predict', {
                method: 'POST',
                body: formData
            });
            const data = await response.json();
            if (data && data.length > 0) {
                const emotionsContainerVideo = document.getElementById('emotionsContainerVideo');
                emotionsContainerVideo.innerHTML = '';
                data.forEach(detected => {
                    console.log('Detected emotion:', detected.emotion);
                    const emotionDiv = document.createElement('div');
                    emotionDiv.textContent = `Seems like, you are ${detected.emotion}`;
                    emotionDiv.style.backgroundColor = 'white';
                    emotionDiv.style.color = 'black';
                    emotionDiv.style.padding = '10px';
                    emotionDiv.style.marginTop = '10px';
                    emotionsContainerVideo.appendChild(emotionDiv);
                });
            }
        } catch (error) {
            console.error('Error sending frame:', error);
        }
    });
}


