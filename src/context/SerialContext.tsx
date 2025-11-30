import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useSerial } from '../hooks/useSerial';
import type { SerialOptions } from '../hooks/useSerial';

export interface LogEntry {
    id: string;
    timestamp: Date;
    direction: 'TX' | 'RX';
    data: Uint8Array;
}

interface SerialContextType {
    isConnected: boolean;
    connect: (options: SerialOptions) => Promise<void>;
    disconnect: () => Promise<void>;
    sendData: (data: string | Uint8Array) => Promise<void>;
    logs: LogEntry[];
    clearLogs: () => void;
    setDataHandler: (handler: ((data: Uint8Array) => void) | null) => void;
    rateLimitConfig: {
        enabled: boolean;
        chunkSize: number;
        delayMs: number;
    };
    setRateLimitConfig: (config: { enabled: boolean; chunkSize: number; delayMs: number }) => void;
    isHexMode: boolean;
    setIsHexMode: (enabled: boolean) => void;
}

const SerialContext = createContext<SerialContextType | null>(null);

// eslint-disable-next-line react-refresh/only-export-components
export const useSerialContext = () => {
    const context = useContext(SerialContext);
    if (!context) {
        throw new Error('useSerialContext must be used within a SerialProvider');
    }
    return context;
};

export const SerialProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { isConnected, connect, disconnect, getReader, write } = useSerial();
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [isHexMode, setIsHexMode] = useState(false);
    const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);
    const dataHandlerRef = useRef<((data: Uint8Array) => void) | null>(null);

    const setDataHandler = useCallback((handler: ((data: Uint8Array) => void) | null) => {
        dataHandlerRef.current = handler;
    }, []);

    const addLog = useCallback((direction: 'TX' | 'RX', data: Uint8Array) => {
        setLogs(prev => {
            const newLog: LogEntry = {
                id: crypto.randomUUID(),
                timestamp: new Date(),
                direction,
                data,
            };
            const newLogs = [...prev, newLog];
            if (newLogs.length > 1000) {
                return newLogs.slice(newLogs.length - 1000);
            }
            return newLogs;
        });
    }, []);

    const sendData = useCallback(async (data: string | Uint8Array) => {
        try {
            await write(data);
            const dataArray = typeof data === 'string' ? new TextEncoder().encode(data) : data;
            addLog('TX', dataArray);
        } catch (error) {
            console.error('Failed to send data:', error);
            throw error;
        }
    }, [write, addLog]);

    // Read loop
    useEffect(() => {
        if (!isConnected) return;

        const readLoop = async () => {
            try {
                const reader = getReader();
                if (!reader) return;
                readerRef.current = reader;

                while (true) {
                    const { value, done } = await reader.read();
                    if (done) {
                        reader.releaseLock();
                        break;
                    }
                    if (value) {
                        if (dataHandlerRef.current) {
                            dataHandlerRef.current(value);
                        } else {
                            addLog('RX', value);
                        }
                    }
                }
            } catch (error) {
                console.error('Read error:', error);
            }
        };

        readLoop();

        return () => {
            if (readerRef.current) {
                readerRef.current.cancel();
                readerRef.current = null;
            }
        };
    }, [isConnected, getReader, addLog]);

    const clearLogs = useCallback(() => {
        setLogs([]);
    }, []);

    const [rateLimitConfig, setRateLimitConfig] = useState({
        enabled: false,
        chunkSize: 64,
        delayMs: 10,
    });

    return (
        <SerialContext.Provider
            value={{
                isConnected,
                connect: async (options) => { await connect(options); },
                disconnect,
                sendData,
                logs,
                clearLogs,
                setDataHandler,
                rateLimitConfig,
                setRateLimitConfig,
                isHexMode,
                setIsHexMode,
            }}
        >
            {children}
        </SerialContext.Provider>
    );
};
