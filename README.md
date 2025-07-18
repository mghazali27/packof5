# Datamatrix Converter Web App

This web application converts datamatrix codes based on a predefined logic. It uses the device's camera to scan a datamatrix, processes the data, and generates a new datamatrix with the converted data.

## How it Works

The application follows these steps:
1.  It accesses the device's camera to scan for a datamatrix code.
2.  Once a code is detected, it extracts the data.
3.  It searches for a matching reference key in a predefined database.
4.  It extracts a 4-digit quantity from a fixed position in the scanned data (characters 20-23).
5.  It multiplies the quantity by a multiplier associated with the reference key.
6.  It reconstructs the data string with the new quantity.
7.  It displays the original and converted data.
8.  It generates a new datamatrix code from the converted data.

## Technologies Used

*   **HTML, CSS, JavaScript:** The core technologies for building the web application.
*   **@zxing/library:** A JavaScript library for decoding barcodes from images and video streams.
*   **bwip-js:** A JavaScript library for generating barcodes.

## How to Use

1.  Open the `index.html` file in a web browser.
2.  Allow the browser to access your camera.
3.  Point the camera at a datamatrix code.
4.  The application will display the original and converted data, along with a new datamatrix code.

## Project Structure

*   `index.html`: The main HTML file.
*   `style.css`: The stylesheet for the application.
*   `script.js`: The JavaScript file containing the application logic.
*   `database.json`: A file containing the reference keys and their multipliers.

## Managing the Database

You can easily add, edit, or remove reference data by modifying the `database.json` file. The file uses a simple key-value format:

```json
{
  "REFERENCE_KEY_1": MULTIPLIER_1,
  "REFERENCE_KEY_2": MULTIPLIER_2,
  "00C029CB01": 5
}
```