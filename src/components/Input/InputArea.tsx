import React, { useState } from 'react';
import type { KeyboardEvent } from 'react';
import { Send } from 'lucide-react';
import { useSerialContext } from '../../context/SerialContext';
import { sendWithRateLimit } from '../../utils/rateLimiter';

export const InputArea: React.FC = () => {
    const { isConnected, sendData, rateLimitConfig, setRateLimitConfig } = useSerialContext();
    const [input, setInput] = useState('');
    const [isHexMode, setIsHexMode] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [progress, setProgress] = useState(0);

    const handleSend = async () => {
        if (!input || !isConnected || isSending) return;

        setIsSending(true);
        setProgress(0);

        try {
            let dataToSend: Uint8Array;

            if (isHexMode) {
                // Parse hex string
                const cleanInput = input.replace(/\s+/g, '');
                if (cleanInput.length % 2 !== 0) {
                    alert('Invalid Hex String');
                    setIsSending(false);
                    return;
                }
                const bytes = new Uint8Array(cleanInput.length / 2);
                for (let i = 0; i < cleanInput.length; i += 2) {
                    bytes[i / 2] = parseInt(cleanInput.substr(i, 2), 16);
                }
                dataToSend = bytes;
            } else {
                dataToSend = new TextEncoder().encode(input);
            }

            // We need to bypass the context's sendData for rate limiting because context's sendData might not expose the writer directly or might wrap it.
            // Actually, context's sendData calls write() which is what we want.
            // But rate limiting needs to call write() multiple times.
            // The context `sendData` logs the *whole* data as one TX.
            // If we chunk it, we might want to log chunks or just the whole thing?
            // For now, let's use a custom send function that calls the context's sendData for each chunk?
            // No, that would log each chunk.
            // Better: The context should expose `write` (raw) and `addLog`.
            // But `useSerialContext` only exposes `sendData`.
            // Let's modify `sendData` in context to support rate limiting? 
            // Or just use `sendData` for each chunk and accept multiple logs?
            // Or better: expose `write` from context.

            // For now, I'll assume `sendData` is fine for small chunks.
            // If I use `sendWithRateLimit`, I need a writer function.

            await sendWithRateLimit(
                async (chunk) => {
                    // We use sendData here, which will log each chunk. 
                    // This might be verbose but it's accurate to what's happening on the wire.
                    await sendData(chunk);
                },
                dataToSend,
                rateLimitConfig.enabled ? rateLimitConfig.chunkSize : 0,
                rateLimitConfig.enabled ? rateLimitConfig.delayMs : 0,
                (sent, total) => {
                    setProgress((sent / total) * 100);
                }
            );

            setInput('');
        } catch (error) {
            console.error('Send failed:', error);
        } finally {
            setIsSending(false);
            setProgress(0);
        }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="flex flex-col gap-2 bg-gray-800 p-2">
            {/* Settings Bar */}
            <div className="flex items-center gap-4 text-xs text-gray-400">
                <label className="flex items-center gap-1 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={isHexMode}
                        onChange={(e) => setIsHexMode(e.target.checked)}
                        className="rounded bg-gray-700 border-gray-600"
                    />
                    Hex Input
                </label>

                <div className="h-4 w-px bg-gray-600" />

                <label className="flex items-center gap-1 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={rateLimitConfig.enabled}
                        onChange={(e) => setRateLimitConfig({ ...rateLimitConfig, enabled: e.target.checked })}
                        className="rounded bg-gray-700 border-gray-600"
                    />
                    Rate Limit
                </label>

                {rateLimitConfig.enabled && (
                    <>
                        <div className="flex items-center gap-1">
                            <span>Delay</span>
                            <input
                                type="number"
                                value={rateLimitConfig.delayMs}
                                onChange={(e) => setRateLimitConfig({ ...rateLimitConfig, delayMs: Number(e.target.value) })}
                                className="w-12 bg-gray-700 border border-gray-600 rounded px-1"
                            />
                            <span>ms</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <span>Every</span>
                            <input
                                type="number"
                                value={rateLimitConfig.chunkSize}
                                onChange={(e) => setRateLimitConfig({ ...rateLimitConfig, chunkSize: Number(e.target.value) })}
                                className="w-12 bg-gray-700 border border-gray-600 rounded px-1"
                            />
                            <span>bytes</span>
                        </div>
                    </>
                )}
            </div>

            {/* Input Bar */}
            <div className="flex gap-2">
                <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={isHexMode ? "Enter Hex (e.g. AA BB CC)" : "Enter text..."}
                    className="flex-1 bg-gray-900 text-white border border-gray-700 rounded p-2 font-mono text-sm resize-none h-10 focus:h-24 transition-all focus:ring-1 focus:ring-blue-500 outline-none"
                    disabled={!isConnected || isSending}
                />
                <button
                    onClick={handleSend}
                    disabled={!isConnected || isSending || !input}
                    className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 rounded flex items-center justify-center min-w-[80px]"
                >
                    {isSending ? (
                        <span className="text-xs">{Math.round(progress)}%</span>
                    ) : (
                        <Send className="w-4 h-4" />
                    )}
                </button>
            </div>
        </div>
    );
};
