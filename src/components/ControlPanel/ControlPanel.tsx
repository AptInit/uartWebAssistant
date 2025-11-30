import React from 'react';
import { useSerialContext } from '../../context/SerialContext';

export const ControlPanel: React.FC = () => {
    const { rateLimitConfig, setRateLimitConfig, isHexMode, setIsHexMode } = useSerialContext();

    return (
        <div className="flex flex-col gap-2 p-2 bg-gray-800 border-b border-gray-700">
            <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Control Panel</h3>
            </div>

            <div className="flex flex-col gap-2">
                {/* Hex Mode Toggle */}
                <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-300">Mode</span>
                    <button
                        onClick={() => setIsHexMode(!isHexMode)}
                        className={`px-3 py-1 rounded text-xs font-medium transition-colors ${isHexMode
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                            }`}
                    >
                        {isHexMode ? 'HEX' : 'TEXT'}
                    </button>
                </div>

                {/* Rate Limit Toggle */}
                <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-300">Rate Limit</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={rateLimitConfig.enabled}
                            onChange={(e) => setRateLimitConfig({ ...rateLimitConfig, enabled: e.target.checked })}
                        />
                        <div className="w-9 h-5 bg-gray-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                </div>

                {/* Rate Limit Config */}
                {rateLimitConfig.enabled && (
                    <div className="flex flex-col gap-2 pl-2 border-l-2 border-gray-700 mt-1">
                        <div className="flex items-center justify-between gap-2">
                            <span className="text-xs text-gray-400">Delay (ms)</span>
                            <input
                                type="number"
                                value={rateLimitConfig.delayMs}
                                onChange={(e) => setRateLimitConfig({ ...rateLimitConfig, delayMs: Number(e.target.value) })}
                                className="w-16 bg-gray-900 border border-gray-600 rounded px-1 text-xs text-right"
                            />
                        </div>
                        <div className="flex items-center justify-between gap-2">
                            <span className="text-xs text-gray-400">Chunk (bytes)</span>
                            <input
                                type="number"
                                value={rateLimitConfig.chunkSize}
                                onChange={(e) => setRateLimitConfig({ ...rateLimitConfig, chunkSize: Number(e.target.value) })}
                                className="w-16 bg-gray-900 border border-gray-600 rounded px-1 text-xs text-right"
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
