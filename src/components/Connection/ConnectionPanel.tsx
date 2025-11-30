import React, { useState } from 'react';
import { Plug, PlugZap, RefreshCw } from 'lucide-react';
import type { SerialOptions } from '../../hooks/useSerial';

interface ConnectionPanelProps {
    isConnected: boolean;
    onConnect: (options: SerialOptions) => Promise<void>;
    onDisconnect: () => Promise<void>;
    onOpenXmodem: () => void;
}

const BAUD_RATES = [9600, 19200, 38400, 57600, 115200];

export const ConnectionPanel: React.FC<ConnectionPanelProps> = ({
    isConnected,
    onConnect,
    onDisconnect,
    onOpenXmodem,
}) => {
    const [baudRate, setBaudRate] = useState(115200);
    const [isConnecting, setIsConnecting] = useState(false);

    const handleConnect = async () => {
        setIsConnecting(true);
        try {
            await onConnect({ baudRate });
        } catch (error) {
            console.error('Connection failed', error);
        } finally {
            setIsConnecting(false);
        }
    };

    return (
        <div className="p-4 bg-gray-800 text-white rounded-lg shadow-md flex items-center gap-4">
            <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-300">Baud Rate:</label>
                <select
                    value={baudRate}
                    onChange={(e) => setBaudRate(Number(e.target.value))}
                    disabled={isConnected}
                    className="bg-gray-700 border border-gray-600 text-white text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 block p-2"
                >
                    {BAUD_RATES.map((rate) => (
                        <option key={rate} value={rate}>
                            {rate}
                        </option>
                    ))}
                </select>
            </div>

            <button
                onClick={isConnected ? onDisconnect : handleConnect}
                disabled={isConnecting}
                className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-colors ${isConnected
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
                {isConnecting ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                ) : isConnected ? (
                    <PlugZap className="w-4 h-4" />
                ) : (
                    <Plug className="w-4 h-4" />
                )}
                {isConnected ? 'Disconnect' : 'Connect'}
            </button>

            <button
                onClick={onOpenXmodem}
                disabled={!isConnected}
                className="bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
            >
                XMODEM
            </button>

            <div className="flex items-center gap-2 ml-auto">
                <div
                    className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-red-500'
                        }`}
                />
                <span className="text-sm text-gray-400">
                    {isConnected ? 'Connected' : 'Disconnected'}
                </span>
            </div>
        </div>
    );
};
