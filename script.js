// Import libraries from esm.sh, which provides pre-bundled modules for browsers.
import { BrowserMultiFormatReader, NotFoundException } from 'https://esm.sh/@zxing/library@0.21.0';
import bwipjs from 'https://esm.sh/bwip-js@4.3.2';

window.addEventListener('load', () => {
    let refDatabase = {};
    const codeReader = new BrowserMultiFormatReader();
    let selectedDeviceId;
    let deferredPrompt; // This will hold the install prompt event

    // --- DOM Elements ---
    const videoElement = document.getElementById('video');
    const resultElement = document.getElementById('result');
    const canvasElement = document.getElementById('barcode');
    const statusElement = document.getElementById('status');
    const resetButton = document.getElementById('resetButton');
    const installButton = document.getElementById('installButton');

    // --- PWA Install Logic ---
    // Hide the button if the app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
        installButton.classList.add('hidden');
    }

    window.addEventListener('beforeinstallprompt', (e) => {
        // Prevent the mini-infobar from appearing on mobile
        e.preventDefault();
        // Stash the event so it can be triggered later.
        deferredPrompt = e;
        // Enable the install button, now that we know it's possible
        installButton.disabled = false;
        updateStatus("Ready to install.");
    });

    installButton.addEventListener('click', async () => {
        if (!deferredPrompt) {
            // The prompt is not available.
            return;
        }
        // Show the install prompt
        deferredPrompt.prompt();
        // Wait for the user to respond to the prompt
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`User response to the install prompt: ${outcome}`);
        // We've used the prompt, and can't use it again, throw it away
        deferredPrompt = null;
        // Hide the button after the prompt is used.
        installButton.classList.add('hidden');
    });

    // --- Register Service Worker ---
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js')
            .then(registration => {
                console.log('Service Worker registered with scope:', registration.scope);
            })
            .catch(error => {
                console.error('Service Worker registration failed:', error);
            });
    }

    function updateStatus(message) {
        console.log(message);
        statusElement.textContent = message;
    }

    updateStatus("Page loaded. Fetching database...");

    // --- Load Database ---
    fetch('database.json')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            refDatabase = data;
            updateStatus("Database loaded. Initializing camera...");
            startScanner();
        })
        .catch(e => {
            updateStatus(`Error: Could not load database. ${e.message}`);
        });

    // --- Barcode Scanning Logic ---
    function startScanner() {
        updateStatus("Searching for camera devices...");
        codeReader.listVideoInputDevices()
            .then((videoInputDevices) => {
                if (videoInputDevices.length > 0) {
                    // Prefer the rear camera
                    let rearCamera = videoInputDevices.find(device => device.label.toLowerCase().includes('back') || device.label.toLowerCase().includes('rear'));
                    
                    if (rearCamera) {
                        selectedDeviceId = rearCamera.deviceId;
                        updateStatus(`Using rear camera: ${rearCamera.label}`);
                    } else {
                        // As a fallback, use the last camera in the list, which is often the rear one.
                        selectedDeviceId = videoInputDevices[videoInputDevices.length - 1].deviceId;
                        updateStatus(`Rear camera not explicitly found. Using last camera in list.`);
                    }
                    
                    decodeFromInput(selectedDeviceId);

                } else {
                    updateStatus("Error: No camera devices found.");
                }
            })
            .catch((err) => {
                updateStatus(`Error listing video devices: ${err.message}`);
            });
    }

    function decodeFromInput(deviceId) {
        updateStatus("Starting video stream. Point camera at a code.");
        videoElement.style.display = 'block'; // Show video
        codeReader.decodeFromVideoDevice(deviceId, videoElement, (result, err) => {
            if (result) {
                codeReader.reset(); // Stop scanning
                videoElement.style.display = 'none'; // Hide video
                const scannedData = result.getText();
                updateStatus("Code found!");
                const processedData = processData(scannedData);
                resultElement.innerHTML = `Original: ${scannedData}<br>Converted: ${processedData}`;
                generateBarcode(processedData);
                resetButton.classList.remove('hidden'); // Show the reset button
            }
            if (err && !(err instanceof NotFoundException)) {
                updateStatus(`Decoding error: ${err.message}`);
            }
        });
    }

    // --- Reset Logic ---
    resetButton.addEventListener('click', () => {
        resultElement.innerHTML = '';
        const context = canvasElement.getContext('2d');
        context.clearRect(0, 0, canvasElement.width, canvasElement.height);
        resetButton.classList.add('hidden');
        decodeFromInput(selectedDeviceId);
    });

    // --- Core Data Processing Logic ---
    function processData(input) {
        let foundRef = null;
        let multiplier = null;
        for (const ref in refDatabase) {
            if (input.includes(ref)) {
                foundRef = ref;
                multiplier = refDatabase[ref];
                break;
            }
        }

        if (!foundRef) {
            return "Reference not found in database.";
        }

        const quantityStr = input.substring(19, 23);
        const quantity = parseInt(quantityStr, 10);
        const newQuantity = quantity * multiplier;
        const newQuantityStr = String(newQuantity).padStart(4, '0');
        const prefix = input.substring(0, 19);
        const suffix = input.substring(23);
        const output = `${prefix}${newQuantityStr}${suffix}`;
        return output;
    }

    // --- Barcode Generation Logic ---
    function generateBarcode(data) {
        if (data && !data.includes("not found")) {
            try {
                bwipjs.toCanvas(canvasElement, {
                    bcid: 'datamatrix',
                    text: data,
                    scale: 3,
                    height: 10,
                    includetext: true,
                    textxalign: 'center',
                });
            } catch (e) {
                updateStatus(`Error generating barcode: ${e.message}`);
            }
        }
    }
});