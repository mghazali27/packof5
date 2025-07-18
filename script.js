window.addEventListener('load', () => {
    let refDatabase = {};

    // --- DOM Elements ---
    const codeReader = new ZXing.BrowserMultiFormatReader();
    const videoElement = document.getElementById('video');
    const resultElement = document.getElementById('result');
    const canvasElement = document.getElementById('barcode');
    const statusElement = document.getElementById('status');

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
                    updateStatus(`Found ${videoInputDevices.length} camera(s). Using the first one.`);
                    const firstDeviceId = videoInputDevices[0].deviceId;
                    decodeFromInput(firstDeviceId);
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
        codeReader.decodeFromVideoDevice(deviceId, videoElement, (result, err) => {
            if (result) {
                codeReader.reset(); // Stop scanning
                const scannedData = result.getText();
                updateStatus("Code found!");
                const processedData = processData(scannedData);
                resultElement.innerHTML = `Original: ${scannedData}<br>Converted: ${processedData}`;
                generateBarcode(processedData);
            }
            if (err && !(err instanceof ZXing.NotFoundException)) {
                updateStatus(`Decoding error: ${err.message}`);
            }
        });
    }

    // --- Core Data Processing Logic ---
    function processData(input) {
        // ... (logic is unchanged)
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
        // ... (logic is unchanged)
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