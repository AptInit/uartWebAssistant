export const toHex = (data: Uint8Array): string => {
    return Array.from(data)
        .map(b => b.toString(16).padStart(2, '0').toUpperCase())
        .join(' ');
};

export const toAscii = (data: Uint8Array): string => {
    // eslint-disable-next-line no-control-regex
    return new TextDecoder().decode(data).replace(/[\x00-\x09\x0B\x0C\x0E-\x1F\x7F]/g, '.'); // Replace non-printable with dot, excluding \n and \r
};

export const formatTimestamp = (date: Date): string => {
    return date.toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        fractionalSecondDigits: 3,
    });
};
