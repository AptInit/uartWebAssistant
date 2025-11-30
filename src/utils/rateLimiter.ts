export const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const sendWithRateLimit = async (
    writer: (data: Uint8Array) => Promise<void>,
    data: Uint8Array,
    chunkSize: number,
    delayMs: number,
    onProgress?: (sent: number, total: number) => void
) => {
    if (chunkSize <= 0 || delayMs < 0) {
        // No rate limit
        await writer(data);
        onProgress?.(data.length, data.length);
        return;
    }

    let offset = 0;
    while (offset < data.length) {
        const end = Math.min(offset + chunkSize, data.length);
        const chunk = data.slice(offset, end);

        await writer(chunk);
        offset = end;
        onProgress?.(offset, data.length);

        if (offset < data.length) {
            await sleep(delayMs);
        }
    }
};
