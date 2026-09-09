

let scannerActive = false;
let videoStream = null;
let canvasContext = null;
let animationFrameId = null;


async function startScanner() {
    if (typeof ZXingWASM === 'undefined') {
        console.error('❌ A biblioteca ZXingWASM não foi carregada no index.html');
        alert('Erro: O motor do scanner não foi carregado. Verifique sua conexão com a internet.');
        return;
    }
    if (!window.isSecureContext && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
        alert('Erro: A câmera só funciona em conexões seguras (HTTPS).');
        return;
    }

    document.getElementById('scanner-container').style.display = 'block';
    scannerActive = true;

    try {
        videoStream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: 'environment',
                width: { ideal: 1280 },
                height: { ideal: 720 }
            }
        });

        const interactive = document.getElementById('interactive');
        let videoElement = document.getElementById('scanner-video');
        
        if (!videoElement) {
            videoElement = document.createElement('video');
            videoElement.id = 'scanner-video';
            interactive.appendChild(videoElement);
        }

        videoElement.srcObject = videoStream;
        videoElement.setAttribute('playsinline', 'true'); // Essencial para iOS
        videoElement.play();
        const canvas = document.createElement('canvas');
        canvasContext = canvas.getContext('2d', { willReadFrequently: true });
        requestAnimationFrame(() => processFrame(videoElement, canvas));

        console.log('✅ Scanner iniciado com sucesso');
    } catch (error) {
        console.error('❌ Erro ao acessar câmera:', error);
        alert('Erro ao acessar a câmera: ' + error.message);
        stopScanner();
    }
}


async function processFrame(videoElement, canvas) {
    if (!scannerActive) return;

    if (videoElement.readyState === videoElement.HAVE_ENOUGH_DATA) {
        try {
            canvas.width = videoElement.videoWidth;
            canvas.height = videoElement.videoHeight;
            canvasContext.drawImage(videoElement, 0, 0);
            const imageData = canvasContext.getImageData(0, 0, canvas.width, canvas.height);
            const results = await ZXingWASM.readBarcodes(imageData, {
                tryHarder: true,
                formats: ['EAN13', 'EAN8', 'Code128', 'Code39', 'UPCA', 'UPCE', 'QRCode'],
                maxNumberOfSymbols: 1
            });

            if (results && results.length > 0) {
                onDetected(results[0].text, results[0].format);
                return; // Para o loop após detecção
            }
        } catch (err) {
            console.warn('Erro no frame:', err);
        }
    }

    animationFrameId = requestAnimationFrame(() => processFrame(videoElement, canvas));
}


function onDetected(code, format) {
    console.log(`🎯 Detectado: ${code} (${format})`);
    
    const codigoInput = document.getElementById('produto-codigo');
    if (codigoInput) {
        codigoInput.value = code;
        codigoInput.dispatchEvent(new Event('input', { bubbles: true }));
    }

    const detectedDiv = document.getElementById('detected-code');
    if (detectedDiv) {
        detectedDiv.textContent = `✅ ${format}: ${code}`;
        detectedDiv.style.display = 'block';
    }

    if (window.showToast) {
        showToast(`Código lido: ${code}`, 'success');
    }

    setTimeout(stopScanner, 800);
}


function stopScanner() {
    scannerActive = false;
    
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }

    if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
        videoStream = null;
    }

    const videoElement = document.getElementById('scanner-video');
    if (videoElement) {
        videoElement.srcObject = null;
        videoElement.remove();
    }

    const scannerContainer = document.getElementById('scanner-container');
    if (scannerContainer) {
        scannerContainer.style.display = 'none';
    }
    
    const detectedDiv = document.getElementById('detected-code');
    if (detectedDiv) {
        detectedDiv.style.display = 'none';
    }
}
window.startScanner = startScanner;
window.stopScanner = stopScanner;
