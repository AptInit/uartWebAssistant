import React, { useState, useRef } from 'react';
import { ArrowDown, ArrowUp, Trash2, FileText, Binary } from 'lucide-react';
import { Virtuoso, type VirtuosoHandle } from 'react-virtuoso';
import { useSerialContext } from '../../context/SerialContext';
import { toHex, toAscii, formatTimestamp } from '../../utils/formatters';

export const CommunicationLog: React.FC = () => {
    const { logs, clearLogs } = useSerialContext();
    const [isHexMode, setIsHexMode] = useState(true);
    const virtuosoRef = useRef<VirtuosoHandle>(null);

    const groupedLogs = React.useMemo(() => {
        if (logs.length === 0) return [];

        const groups: { id: string; timestamp: Date; direction: 'TX' | 'RX'; data: Uint8Array[] }[] = [];
        let currentGroup = {
            id: logs[0].id,
            timestamp: logs[0].timestamp,
            direction: logs[0].direction,
            data: [logs[0].data]
        };

        for (let i = 1; i < logs.length; i++) {
            const timeDiff = logs[i].timestamp.getTime() - logs[i - 1].timestamp.getTime();
            if (logs[i].direction === currentGroup.direction && timeDiff < 50) {
                currentGroup.data.push(logs[i].data);
            } else {
                groups.push(currentGroup);
                currentGroup = {
                    id: logs[i].id,
                    timestamp: logs[i].timestamp,
                    direction: logs[i].direction,
                    data: [logs[i].data]
                };
            }
        }
        groups.push(currentGroup);
        return groups;
    }, [logs]);

    return (
        <div className="flex flex-col h-full bg-gray-900 border-l border-gray-700">
            <div className="flex items-center justify-between p-2 bg-gray-800 border-b border-gray-700">
                <h3 className="text-sm font-semibold text-gray-300">Communication Log</h3>
                <div className="flex gap-2">
                    <button
                        onClick={() => setIsHexMode(!isHexMode)}
                        className="p-1 hover:bg-gray-700 rounded text-gray-400 hover:text-white"
                        title={isHexMode ? "Switch to Text" : "Switch to Hex"}
                    >
                        {isHexMode ? <Binary className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                    </button>
                    <button
                        onClick={clearLogs}
                        className="p-1 hover:bg-gray-700 rounded text-gray-400 hover:text-red-400"
                        title="Clear Logs"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </div>

            <div className="flex-1 p-2">
                <Virtuoso
                    style={{ height: '100%' }}
                    ref={virtuosoRef}
                    data={groupedLogs}
                    followOutput={'auto'}
                    itemContent={(_, group) => {
                        const fullText = group.data.map(chunk => isHexMode ? toHex(chunk) : toAscii(chunk)).join('');
                        // Truncate for performance, but Virtuoso handles variable height so we could show more if we wanted.
                        // Let's keep it somewhat limited for now but allow wrapping.
                        const displayText = fullText.length > 500 ? fullText.slice(0, 500) + '...' : fullText;

                        return (
                            <div className="flex gap-2 hover:bg-gray-800 p-1 rounded group items-start mb-1">
                                <span className="text-gray-500 shrink-0 select-none text-[10px] w-14 pt-0.5">
                                    {formatTimestamp(group.timestamp)}
                                </span>
                                <span className={`shrink-0 ${group.direction === 'TX' ? 'text-blue-400' : 'text-green-400'} select-none pt-0.5`}>
                                    {group.direction === 'TX' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                                </span>
                                <div className="flex-1 min-w-0 break-all whitespace-pre-wrap text-gray-300 text-xs font-mono">
                                    {displayText}
                                </div>
                            </div>
                        );
                    }}
                    className="scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent"
                />
            </div>
        </div>
    );
};
