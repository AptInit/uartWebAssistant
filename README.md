# UART Web Assistant

A modern, web-based serial port terminal for embedded development, built with React, TypeScript, and Vite.

## Features

- **Web Serial API Integration**: Connect to serial devices directly from your browser.
- **Multiple Modes**: Support for both ASCII/Text and Hexadecimal data visualization.
- **XMODEM Support**: Upload and download files using the XMODEM protocol.
- **Copy to Clipboard**: Click on any log entry to copy its content.

## Getting Started

### Prerequisites

- Node.js (v18 or later recommended)
- A modern browser with Web Serial API support (Chrome, Edge, Opera).

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/AptInit/uartWebAssistant.git
   cd uartWebAssistant
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

### Running Locally

Start the development server:

```bash
npm run dev
```

Open your browser and navigate to `http://localhost:5173`.

## Usage Guide

### Connecting to a Device

1. Click the **Connect** button in the top left corner.
2. Select your serial device from the browser prompt.
3. Configure the baud rate (default is 115200) and other settings if necessary.

### Sending and Receiving Data

- **Control Panel**: Located in the top right, this panel contains:
  - **Hex Mode**: Toggle between ASCII/Text and Hexadecimal display modes.
  - **Rate Limit**: Configure data sending rate limits (Delay and Chunk size) to prevent buffer overflows on slower devices.
- **Input Area**: Type your message in the input field at the bottom and press Enter or click Send.
- **Logs**: Click on any log entry (TX or RX) to copy its content to the clipboard.

### XMODEM File Transfer

- **Upload**: Click the "Upload" button to send a file to the connected device using XMODEM.
  - Supports **Rate Limiting** for uploads to slow devices.
- **Download**: Click the "Download" button to receive a file from the device.
  - Uses the browser's **File Save Picker** to save the received file.

## Building for Production

To create a production build:

```bash
npm run build
```

The output will be in the `dist` directory.

## License

This project is licensed under the BSD 2-Clause License.
