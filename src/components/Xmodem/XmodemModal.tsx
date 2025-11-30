import React, { useState, useRef } from 'react';
import { Upload, Download, X, Ban } from 'lucide-react';
import { useSerialContext } from '../../context/SerialContext';
import { createPacket, EOT, ACK, NAK, C_CHAR, SOH, CAN, calculateCRC16, calculateChecksum } from '../../utils/xmodem';
import { sendWithRateLimit, sleep } from '../../utils/rateLimiter';

interface XmodemModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const XmodemModal: React.FC<XmodemModalProps> = ({ isOpen, onClose }) => {
    const { sendData, setDataHandler, rateLimitConfig, setRateLimitConfig } = useSerialContext();
    const [file, setFile] = useState<File | null>(null);
    const [progress, setProgress] = useState(0);
    const [status, setStatus] = useState('');
    const [isTransferring, setIsTransferring] = useState(false);

    // Buffer for incoming data
    const bufferRef = useRef<number[]>([]);
    const resolveRef = useRef<(() => void) | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const waitForByte = (timeoutMs: number = 10000): Promise<number> => {
        return new Promise((resolve, reject) => {
            if (bufferRef.current.length > 0) {
                resolve(bufferRef.current.shift()!);
                return;
            }

            const timer = setTimeout(() => {
                resolveRef.current = null;
                reject(new Error('Timeout waiting for response'));
            }, timeoutMs);

            resolveRef.current = () => {
                clearTimeout(timer);
                if (bufferRef.current.length > 0) {
                    resolve(bufferRef.current.shift()!);
                }
            };
        });
    };

    const sendCancel = async () => {
        if (isTransferring) return;
        setIsTransferring(true);
        setStatus('Sending Cancel sequence...');

        bufferRef.current = [];
        let responseReceived = false;

        setDataHandler((data) => {
            if (data.length > 0) {
                responseReceived = true;
            }
        });

        try {
            // Send CAN every 100ms until response or timeout (approx 3s)
            const MAX_RETRIES = 30;
            for (let i = 0; i < MAX_RETRIES; i++) {
                if (responseReceived) break;
                await sendData(new Uint8Array([CAN]));
                await new Promise(resolve => setTimeout(resolve, 100));
            }

            if (responseReceived) {
                setStatus('Remote responded. Cancel sequence stopped.');
            } else {
                setStatus('No response to Cancel sequence.');
            }
        } catch (error: any) {
            setStatus(`Error: ${error.message}`);
        } finally {
            setIsTransferring(false);
            setDataHandler(null);
        }
    };

    const startUpload = async () => {
        if (!file) return;
        setIsTransferring(true);
        setStatus('Waiting for receiver (C)...');
        setProgress(0);
        bufferRef.current = []; // Clear buffer

        // Take over the data stream
        setDataHandler((data) => {
            for (const byte of data) {
                bufferRef.current.push(byte);
            }
            if (resolveRef.current) {
                const resolve = resolveRef.current;
                resolveRef.current = null;
                resolve();
            }
        });

        try {
            const buffer = await file.arrayBuffer();
            const data = new Uint8Array(buffer);
            let blockNumber = 1;
            let offset = 0;
            let useCRC = false;

            // Handshake
            try {
                const initialByte = await waitForByte(10000); // Wait up to 10s for start
                if (initialByte === C_CHAR) {
                    useCRC = true;
                    setStatus('Receiver requested CRC. Sending...');
                } else if (initialByte === NAK) {
                    useCRC = false;
                    setStatus('Receiver requested Checksum. Sending...');
                } else {
                    throw new Error(`Unexpected initial byte: 0x${initialByte.toString(16)}`);
                }
            } catch (e) {
                throw new Error('Handshake timed out. Ensure receiver is ready.');
            }

            while (offset < data.length) {
                const chunk = data.slice(offset, offset + 128);
                const packet = createPacket(blockNumber, chunk, useCRC);

                let sent = false;
                let retries = 0;
                const MAX_RETRIES = 10;

                let currentRateLimitConfig = { ...rateLimitConfig };

                while (!sent && retries < MAX_RETRIES) {
                    await sendWithRateLimit(
                        async (chunk) => await sendData(chunk),
                        packet,
                        currentRateLimitConfig.enabled ? currentRateLimitConfig.chunkSize : 0,
                        currentRateLimitConfig.enabled ? currentRateLimitConfig.delayMs : 0
                    );

                    try {
                        const response = await waitForByte(1000);
                        if (response === ACK) {
                            sent = true;
                            offset += 128;
                            blockNumber = (blockNumber + 1) & 0xFF;
                            setProgress(Math.min(100, Math.round((offset / data.length) * 100)));
                            setStatus(`Sending block ${blockNumber}...`);
                            await sleep(20);
                        } else if (response === NAK) {
                            setStatus(`NAK received. Retrying block ${blockNumber}...`);
                            retries++;
                            // Enable rate limiting on failure
                            if (!currentRateLimitConfig.enabled || currentRateLimitConfig.chunkSize !== 4 || currentRateLimitConfig.delayMs !== 100) {
                                currentRateLimitConfig = { enabled: true, chunkSize: 4, delayMs: 100 };
                                setRateLimitConfig(currentRateLimitConfig);
                                setStatus(`NAK received. Retrying block ${blockNumber} with rate limit...`);
                            }
                        } else if (response === C_CHAR) {
                            // Sometimes receiver sends C again?
                            retries++;
                        } else {
                            // Ignore garbage?
                        }
                    } catch (e) {
                        setStatus(`Timeout. Retrying block ${blockNumber}...`);
                        retries++;
                        // Enable rate limiting on failure
                        if (!currentRateLimitConfig.enabled || currentRateLimitConfig.chunkSize !== 4 || currentRateLimitConfig.delayMs !== 100) {
                            currentRateLimitConfig = { enabled: true, chunkSize: 4, delayMs: 100 };
                            setRateLimitConfig(currentRateLimitConfig);
                            setStatus(`Timeout. Retrying block ${blockNumber} with rate limit...`);
                        }
                    }
                }

                if (!sent) {
                    throw new Error('Too many retries. Transfer failed.');
                }
            }

            // End of Transmission
            await sendData(new Uint8Array([EOT]));
            try {
                const eotResponse = await waitForByte(1000);
                if (eotResponse !== ACK) {
                    // Try sending EOT again?
                    await sendData(new Uint8Array([EOT]));
                }
            } catch (e) {
                // Ignore EOT timeout
            }

            setStatus('Transfer Complete!');
        } catch (error: any) {
            setStatus(`Error: ${error.message}`);
            console.error(error);
        } finally {
            setIsTransferring(false);
            setDataHandler(null); // Release data stream
        }
    };

    const startDownload = async () => {
        setIsTransferring(true);
        setStatus('Ready to receive. Waiting for sender...');
        setProgress(0);

        bufferRef.current = []; // Clear buffer

        const receivedData: Uint8Array[] = [];
        let expectedBlock = 1;
        let retries = 0;
        const MAX_RETRIES = 10;
        let useCRC = true; // Try CRC first

        // Take over data stream
        setDataHandler((data) => {
            for (const byte of data) {
                bufferRef.current.push(byte);
            }
            if (resolveRef.current) {
                const resolve = resolveRef.current;
                resolveRef.current = null;
                resolve();
            }
        });

        try {
            // Send C to request CRC
            await sendData(new Uint8Array([C_CHAR]));

            let firstBlockReceived = false;

            while (true) {
                try {
                    const byte = await waitForByte(3000); // Wait for SOH or EOT

                    if (byte === SOH) {
                        // Read block number
                        const blockNum = await waitForByte();
                        const invBlockNum = await waitForByte();

                        // Read 128 bytes data
                        const blockData = new Uint8Array(128);
                        for (let i = 0; i < 128; i++) {
                            blockData[i] = await waitForByte();
                        }

                        // Read Checksum/CRC
                        let receivedCrcOrChecksum = 0;
                        if (useCRC) {
                            const crcHigh = await waitForByte();
                            const crcLow = await waitForByte();
                            receivedCrcOrChecksum = (crcHigh << 8) | crcLow;
                        } else {
                            receivedCrcOrChecksum = await waitForByte();
                        }

                        // Validate Block Number
                        if (blockNum !== expectedBlock || ((blockNum + invBlockNum) & 0xFF) !== 0xFF) {
                            console.warn(`Block number mismatch: expected ${expectedBlock}, got ${blockNum}`);
                            // Error or duplicate
                            if (blockNum === ((expectedBlock - 1) & 0xFF)) {
                                // Duplicate, ACK and ignore
                                await sendData(new Uint8Array([ACK]));
                                continue;
                            }
                            // Fatal error or out of sync
                            await sendData(new Uint8Array([CAN]));
                            throw new Error(`Block number mismatch: expected ${expectedBlock}, got ${blockNum}`);
                        }

                        // Validate CRC/Checksum
                        if (useCRC) {
                            const calculatedCrc = calculateCRC16(blockData);
                            if (calculatedCrc !== receivedCrcOrChecksum) {
                                console.warn(`CRC mismatch: expected ${calculatedCrc.toString(16)}, got ${receivedCrcOrChecksum.toString(16)}`);
                                await sendData(new Uint8Array([NAK]));
                                continue;
                            }
                        } else {
                            const calculatedChecksum = calculateChecksum(blockData);
                            if (calculatedChecksum !== receivedCrcOrChecksum) {
                                console.warn(`Checksum mismatch: expected ${calculatedChecksum.toString(16)}, got ${receivedCrcOrChecksum.toString(16)}`);
                                await sendData(new Uint8Array([NAK]));
                                continue;
                            }
                        }

                        receivedData.push(blockData);
                        expectedBlock = (expectedBlock + 1) & 0xFF;
                        await sendData(new Uint8Array([ACK]));
                        firstBlockReceived = true;
                        setStatus(`Received block ${blockNum}...`);

                    } else if (byte === EOT) {
                        await sendData(new Uint8Array([ACK]));
                        break; // Transfer done
                    } else {
                        // Unexpected byte - ignore it to avoid flooding
                        console.log(`Ignored unexpected byte: 0x${byte.toString(16)}`);
                    }
                } catch (e) {
                    console.warn('Receive loop error:', e);
                    if (!firstBlockReceived && retries < MAX_RETRIES) {
                        retries++;
                        console.log('Retrying handshake...');
                        await sendData(new Uint8Array([useCRC ? C_CHAR : NAK]));
                    } else {
                        throw e;
                    }
                }
            }

            // Combine data and download
            const totalLength = receivedData.length * 128;
            const finalBuffer = new Uint8Array(totalLength);
            for (let i = 0; i < receivedData.length; i++) {
                finalBuffer.set(receivedData[i], i * 128);
            }

            // Try to use File System Access API
            let saved = false;
            try {
                // @ts-ignore
                if (window.showSaveFilePicker) {
                    // @ts-ignore
                    const handle = await window.showSaveFilePicker({
                        suggestedName: 'received_file.bin',
                        types: [{
                            description: 'Binary File',
                            accept: { 'application/octet-stream': ['.bin'] },
                        }],
                    });
                    const writable = await handle.createWritable();
                    await writable.write(finalBuffer);
                    await writable.close();
                    saved = true;
                }
            } catch (err: any) {
                if (err.name === 'AbortError') {
                    setStatus('Download cancelled');
                    return;
                }
                console.warn('File System Access API failed, falling back to legacy download:', err);
            }

            if (!saved) {
                // Create blob and download
                const blob = new Blob([finalBuffer], { type: 'application/octet-stream' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'received_file.bin';
                a.target = '_blank';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                setTimeout(() => URL.revokeObjectURL(url), 100);
            }

            setStatus('Download Complete!');
        } catch (error: any) {
            setStatus(`Error: ${error.message}`);
        } finally {
            setIsTransferring(false);
            setDataHandler(null);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-gray-800 p-6 rounded-lg shadow-xl w-96 border border-gray-700">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-white">XMODEM Transfer</h2>
                    <button onClick={onClose} disabled={isTransferring} className="text-gray-400 hover:text-white">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Select File to Send</label>
                        <input
                            type="file"
                            onChange={handleFileChange}
                            disabled={isTransferring}
                            className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700"
                        />
                    </div>

                    {status && (
                        <div className="text-sm text-yellow-400 font-mono bg-gray-900 p-2 rounded">
                            {status}
                        </div>
                    )}

                    {isTransferring && (
                        <div className="w-full bg-gray-700 rounded-full h-2.5">
                            <div
                                className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                                style={{ width: `${progress}%` }}
                            ></div>
                        </div>
                    )}

                    <div className="flex gap-2 pt-2">
                        <button
                            onClick={sendCancel}
                            disabled={isTransferring}
                            className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white py-2 rounded flex items-center justify-center gap-2"
                            title="Send Cancel (CAN) bytes until response"
                        >
                            <Ban className="w-4 h-4" />
                            Cancel
                        </button>
                        <button
                            onClick={startUpload}
                            disabled={!file || isTransferring}
                            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-2 rounded flex items-center justify-center gap-2"
                        >
                            <Upload className="w-4 h-4" />
                            Upload
                        </button>
                        <button
                            onClick={startDownload}
                            disabled={isTransferring}
                            className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white py-2 rounded flex items-center justify-center gap-2"
                        >
                            <Download className="w-4 h-4" />
                            Receive
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
