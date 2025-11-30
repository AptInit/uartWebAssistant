import React, { useState } from 'react';
import type { KeyboardEvent } from 'react';
import { Send } from 'lucide-react';
import { useSerialContext } from '../../context/SerialContext';
import { sendWithRateLimit } from '../../utils/rateLimiter';

export const InputArea: React.FC = () => {
    const { isConnected, sendData, rateLimitConfig, isHexMode } = useSerialContext();
    const [input, setInput] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [progress, setProgress] = useState(0);
    const inputRef = React.useRef<HTMLTextAreaElement>(null);

    React.useEffect(() => {
        if (!isSending && isConnected) {
            inputRef.current?.focus();
        }
    }, [isSending, isConnected]);

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
            {/* Settings Bar Removed - Moved to ControlPanel */}

            {/* Input Bar */}
            <div className="flex gap-2">
                <textarea
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={isHexMode ? "Enter Hex (e.g. AA BB CC)" : "Type text, press Enter to send, or use Shift+Enter for a new line."}
                    className="flex-1 bg-gray-900 text-white border border-gray-700 rounded p-2 font-mono text-sm resize-none h-10 focus:h-24 transition-all focus:ring-1 focus:ring-blue-500 outline-none"
                    disabled={!isConnected}
                    readOnly={isSending}
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
