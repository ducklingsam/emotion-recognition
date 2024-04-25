// scripts.js
document.addEventListener('DOMContentLoaded', function() {
    checkSystemStatus();
});

let webcamActive = false;

async function checkSystemStatus() {
    try {
        const response = await fetch('/api/status');
        const statusDiv = document.getElementById('status');
        if (response.ok) {
            statusDiv.textContent = 'Система доступна';
            statusDiv.className = 'green';
            statusDiv.classList.remove('blink');
            setTimeout(function() {
                statusDiv.style.display = 'none';
                document.getElementById('mainInterface').style.display = 'block';
            }, 3000);
        } else {
            statusDiv.textContent = 'Система не доступна';
            statusDiv.className = 'red blink';
            document.getElementById('mainInterface').style.display = 'none';
        }
    } catch (error) {
        const statusDiv = document.getElementById('status');
        statusDiv.textContent = 'Ошибка связи с сервером';
        statusDiv.className = 'red blink';
        console.error('Ошибка при проверке статуса:', error);
    }
}

async function uploadImage() {
    const fileInput = document.getElementById('imageInput');
    const file = fileInput.files[0];
    if (file) {
        const formData = new FormData();
        formData.append('image', file);

        document.getElementById('uploadStatus').textContent = 'Загрузка...';
        const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData
        });
        const resultText = await response.text();
        document.getElementById('uploadStatus').textContent = resultText;
    } else {
        alert('Пожалуйста, выберите файл изображения.');
    }
}

async function toggleWebcam() {
    const video = document.querySelector('video');
    const button = document.getElementById('webcamButton');
    if (!webcamActive) {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        video.srcObject = stream;
        webcamActive = true;
        button.textContent = 'Выключить веб-камеру';
    } else {
        video.srcObject.getTracks().forEach(track => track.stop());
        video.srcObject = null;
        webcamActive = false;
        button.textContent = 'Включить веб-камеру';
    }
}
