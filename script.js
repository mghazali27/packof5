window.addEventListener('load', () => {
    let refDatabase = {};

    // --- DOM Elements ---
    const codeReader = new ZXing.BrowserMultiFormatReader();
    const videoElement = document.getElementById('video');
    const resultElement = document.getElementById('result');
    const canvasElement = document.getElementById('barcode');

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
            console.log("Database loaded successfully.");
            // Start the camera only after the database is loaded
            startScanner();
        })
        .catch(e => {
            console.error("Error loading database:", e);
            resultElement.textContent = "Error: Could not load the reference database.";
        });

    // --- Barcode Scanning Logic ---
    function startScanner() {
        codeReader.listVideoInputDevices()
            .then((videoInputDevices) => {
                if (videoInputDevices.length > 0) {
                    const firstDeviceId = videoInputDevices[0].deviceId;
                    decodeFromInput(firstDeviceId);
                } else {
                    console.error("No video input devices found.");
                    resultElement.textContent = "Error: No camera found.";
                }
            })
            .catch((err) => {
                console.error(err);
                resultElement.textContent = `Error: ${err}`;
            });
    }

    function decodeFromInput(deviceId) {
        codeReader.decodeFromVideoDevice(deviceId, videoElement, (result, err) => {
            if (result) {
                codeReader.reset(); // Stop scanning
                const scannedData = result.getText();
                console.log(`Scanned data: ${scannedData}`);
                const processedData = processData(scannedData);
                resultElement.innerHTML = `Original: ${scannedData}<br>Converted: ${processedData}`;
                generateBarcode(processedData);
            }
            if (err && !(err instanceof ZXing.NotFoundException)) {
                console.error(err);
                resultElement.textContent = `Error: ${err}`;
            }
        });
    }

    // --- Core Data Processing Logic ---
    function processData(input) {
        // 1. Find matching reference
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

        // 2. Extract quantity from fixed position (char 20-23)
        const quantityStr = input.substring(19, 23);
        const quantity = parseInt(quantityStr, 10);

        // 3. Calculate new quantity
        const newQuantity = quantity * multiplier;

        // 4. Format new quantity to 4 digits
        const newQuantityStr = String(newQuantity).padStart(4, '0');

        // 5. Reconstruct output string
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
                    bcid: 'datamatrix',       // Barcode type
                    text: data,               // Text to encode
                    scale: 3,                 // 3x scaling factor
                    height: 10,               // Bar height, in millimeters
                    includetext: true,        // Show human-readable text
                    textxalign: 'center',     // Always good to set this
                });
            } catch (e) {
                console.error(e);
                resultElement.textContent = `Error generating barcode: ${e}`;
            }
        }
    }
});