import { useState, useRef, useCallback } from 'react';

export interface SerialPortState {
    isConnected: boolean;
    port: SerialPort | null;
    baudRate: number;
}

export interface SerialOptions {
    baudRate: number;
    dataBits?: 7 | 8;
    stopBits?: 1 | 2;
    parity?: 'none' | 'even' | 'odd';
    flowControl?: 'none' | 'hardware';
}

export const useSerial = () => {
    const [state, setState] = useState<SerialPortState>({
        isConnected: false,
        port: null,
        baudRate: 115200,
    });

    const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);
    const writerRef = useRef<WritableStreamDefaultWriter<Uint8Array> | null>(null);
    const portRef = useRef<SerialPort | null>(null);

    const connect = useCallback(async (options: SerialOptions) => {
        try {
            if (!navigator.serial) {
                throw new Error('Web Serial API not supported');
            }

            const port = await navigator.serial.requestPort();
            await port.open({
                baudRate: options.baudRate,
                dataBits: options.dataBits || 8,
                stopBits: options.stopBits || 1,
                parity: options.parity || 'none',
                flowControl: options.flowControl || 'none',
            });

            portRef.current = port;

            // Setup writer
            if (port.writable) {
                writerRef.current = port.writable.getWriter();
            }

            setState({
                isConnected: true,
                port,
                baudRate: options.baudRate,
            });

            return port;
        } catch (error) {
            console.error('Failed to connect:', error);
            throw error;
        }
    }, []);

    const disconnect = useCallback(async () => {
        try {
            const port = portRef.current;
            if (!port) return;

            if (readerRef.current) {
                await readerRef.current.cancel();
                // We don't release lock here as the consumer (SerialContext) holds the reader
                // and should release it when the read loop terminates due to cancel()
                readerRef.current = null;
            }

            if (writerRef.current) {
                await writerRef.current.close();
                writerRef.current.releaseLock();
                writerRef.current = null;
            }

            await port.close();
            portRef.current = null;

            setState(prev => ({ ...prev, isConnected: false, port: null }));
        } catch (error) {
            console.error('Failed to disconnect:', error);
            throw error;
        }
    }, []);

    const write = useCallback(async (data: Uint8Array | string) => {
        if (!writerRef.current) {
            throw new Error('Port not writable');
        }

        try {
            const dataArray = typeof data === 'string'
                ? new TextEncoder().encode(data)
                : data;

            await writerRef.current.write(dataArray);
        } catch (error) {
            console.error('Write error:', error);
            throw error;
        }
    }, []);

    // Helper to read data - usually called in a loop by the consumer
    const getReader = useCallback(() => {
        if (!portRef.current || !portRef.current.readable) return null;
        const reader = portRef.current.readable.getReader();
        readerRef.current = reader;
        return reader;
    }, []);

    return {
        ...state,
        connect,
        disconnect,
        write,
        getReader,
    };
};
