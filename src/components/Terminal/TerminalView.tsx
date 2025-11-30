import React, { useRef, useEffect } from 'react';
import { useSerialContext } from '../../context/SerialContext';
import { toHex, toAscii } from '../../utils/formatters';

export const TerminalView: React.FC = () => {
    const { logs, isHexMode } = useSerialContext(); // In a real terminal, we might want a separate stream buffer, but using logs for now is easier to sync.
    // Actually, for a raw terminal, we usually want a continuous stream. 
    // But since we are building a "web assistant", maybe a list of packets is better?
    // The user asked for "Terminal for embedded development".
    // Let's use a simple pre tag that accumulates data.

    // However, using `logs` is safer for React state. 
    // Let's render the logs in a "Terminal" style (continuous text).

    const endRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logs]);

    const groupedLogs = React.useMemo(() => {
        const visibleLogs = logs.filter(log => !log.hiddenFromTerminal);
        if (visibleLogs.length === 0) return [];

        const groups: { id: string; direction: 'TX' | 'RX'; data: Uint8Array[] }[] = [];
        let currentGroup = {
            id: visibleLogs[0].id,
            direction: visibleLogs[0].direction,
            data: [visibleLogs[0].data]
        };

        for (let i = 1; i < visibleLogs.length; i++) {
            if (visibleLogs[i].direction === currentGroup.direction) {
                currentGroup.data.push(visibleLogs[i].data);
            } else {
                groups.push(currentGroup);
                currentGroup = {
                    id: visibleLogs[i].id,
                    direction: visibleLogs[i].direction,
                    data: [visibleLogs[i].data]
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
        </div>
    );
};
