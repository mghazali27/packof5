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
    let isInstallable = false;
    
    // Hide the button if the app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
        installButton.classList.add('hidden');
    } else {
        // Always show install button when not in standalone mode
        installButton.classList.remove('hidden');
        installButton.disabled = true; // Initially disabled until we check installability
    }

    window.addEventListener('beforeinstallprompt', (e) => {
        // Prevent the mini-infobar from appearing on mobile
        e.preventDefault();
        // Stash the event so it can be triggered later.
        deferredPrompt = e;
        isInstallable = true;
        // Enable the install button when prompt is available
        installButton.disabled = false;
        installButton.textContent = 'Install App';
        updateStatus("App is ready to install. Click the install button.");
    });

    // Check if app is installable (for browsers that don't support beforeinstallprompt)
    window.addEventListener('load', () => {
        if (!window.matchMedia('(display-mode: standalone)').matches) {
            // Check if PWA criteria are met
            if ('serviceWorker' in navigator && 'BeforeInstallPromptEvent' in window) {
                // Modern browser with PWA support
                setTimeout(() => {
                    if (!isInstallable) {
                        installButton.disabled = false;
                        installButton.textContent = 'Install Guide';
                        updateStatus("Install prompt not available. Use browser menu to install.");
                    }
                }, 2000);
            } else {
                // Fallback for older browsers
                installButton.disabled = false;
                installButton.textContent = 'Install Guide';
                updateStatus("Use browser menu to install this app.");
            }
        }
    });

    installButton.addEventListener('click', async () => {
        if (deferredPrompt) {
            // Show the install prompt
            deferredPrompt.prompt();
            // Wait for the user to respond to the prompt
            const { outcome } = await deferredPrompt.userChoice;
            console.log(`User response to the install prompt: ${outcome}`);
            // We've used the prompt, and can't use it again, throw it away
            deferredPrompt = null;
            // Hide the button after the prompt is used.
            installButton.classList.add('hidden');
        } else {
            // Fallback: Show installation instructions
            showInstallInstructions();
        }
    });

    function showInstallInstructions() {
        const instructions = `
            <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
                        background: rgba(0,0,0,0.8); z-index: 1000; display: flex; 
                        align-items: center; justify-content: center;">
                <div style="background: white; padding: 20px; border-radius: 10px; 
                            max-width: 400px; margin: 20px; text-align: center;">
                    <h3>Install This App</h3>
                    <p>To install this app on your device:</p>
                    <ul style="text-align: left; margin: 15px 0;">
                        <li><strong>Chrome/Edge:</strong> Tap the ⋮ menu → "Install app" or "Add to Home Screen"</li>
                        <li><strong>Safari (iOS):</strong> Tap the share icon → "Add to Home Screen"</li>
                        <li><strong>Firefox:</strong> Tap the ⋮ menu → "Install"</li>
                    </ul>
                    <button onclick="this.parentElement.parentElement.remove()" 
                            style="padding: 10px 20px; background: #007bff; color: white; 
                                   border: none; border-radius: 5px; cursor: pointer;">
                        Got it!
                    </button>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', instructions);
    }

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
