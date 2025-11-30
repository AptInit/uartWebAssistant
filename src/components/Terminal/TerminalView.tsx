import React, { useState, useRef, useEffect } from 'react';
import { useSerialContext } from '../../context/SerialContext';
import { toHex, toAscii } from '../../utils/formatters';

export const TerminalView: React.FC = () => {
    const { logs } = useSerialContext(); // In a real terminal, we might want a separate stream buffer, but using logs for now is easier to sync.
    // Actually, for a raw terminal, we usually want a continuous stream. 
    // But since we are building a "web assistant", maybe a list of packets is better?
    // The user asked for "Terminal for embedded development".
    // Let's use a simple pre tag that accumulates data.

    // However, using `logs` is safer for React state. 
    // Let's render the logs in a "Terminal" style (continuous text).

    const [isHexMode, setIsHexMode] = useState(false);
    const endRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logs]);

    const groupedLogs = React.useMemo(() => {
        if (logs.length === 0) return [];

        const groups: { id: string; direction: 'TX' | 'RX'; data: Uint8Array[] }[] = [];
        let currentGroup = {
            id: logs[0].id,
            direction: logs[0].direction,
            data: [logs[0].data]
        };

        for (let i = 1; i < logs.length; i++) {
            if (logs[i].direction === currentGroup.direction) {
                currentGroup.data.push(logs[i].data);
            } else {
                groups.push(currentGroup);
                currentGroup = {
                    id: logs[i].id,
                    direction: logs[i].direction,
                    data: [logs[i].data]
                };
            }
        }
        groups.push(currentGroup);
        return groups;
    }, [logs]);

    return (
        <div className="flex flex-col h-full bg-black text-green-500 font-mono text-sm p-4 overflow-y-auto">
            <div className="flex-1 whitespace-pre-wrap break-all">
                {groupedLogs.map((group) => (
                    <span key={group.id} className={group.direction === 'TX' ? 'text-yellow-400 font-bold' : 'text-green-400'}>
                        {group.data.map((chunk, i) => (
                            <React.Fragment key={i}>
                                {isHexMode ? toHex(chunk) + ' ' : toAscii(chunk)}
                            </React.Fragment>
                        ))}
                    </span>
                ))}
                <div ref={endRef} />
            </div>

            {/* Floating controls for the terminal view */}
            <div className="fixed bottom-20 right-96 mr-4 bg-gray-800 p-2 rounded shadow-lg opacity-80 hover:opacity-100 transition-opacity">
                <label className="flex items-center gap-2 text-white text-xs cursor-pointer">
                    <input
                        type="checkbox"
                        checked={isHexMode}
                        onChange={(e) => setIsHexMode(e.target.checked)}
                        className="rounded bg-gray-700 border-gray-600"
                    />
                    Hex Mode
                </label>
            </div>
        </div>
    );
};
