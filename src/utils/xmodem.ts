export const SOH = 0x01;
export const EOT = 0x04;
export const ACK = 0x06;
export const NAK = 0x15;
export const CAN = 0x18;
export const C_CHAR = 0x43; // 'C'

const CRC16_POLY = 0x1021;

export const calculateCRC16 = (data: Uint8Array): number => {
    let crc = 0;
    for (let i = 0; i < data.length; i++) {
        crc = crc ^ (data[i] << 8);
        for (let j = 0; j < 8; j++) {
            if (crc & 0x8000) {
                crc = (crc << 1) ^ CRC16_POLY;
            } else {
                crc = crc << 1;
            }
        }
    }
    return crc & 0xFFFF;
};

export const calculateChecksum = (data: Uint8Array): number => {
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
        sum = (sum + data[i]) & 0xFF;
    }
    return sum;
};

export const createPacket = (blockNumber: number, data: Uint8Array, useCRC: boolean): Uint8Array => {
    const packetSize = 3 + 128 + (useCRC ? 2 : 1);
    const packet = new Uint8Array(packetSize);

    packet[0] = SOH;
    packet[1] = blockNumber & 0xFF;
    packet[2] = (~blockNumber) & 0xFF;

    // Copy data (pad with 0x1A (SUB) if < 128)
    for (let i = 0; i < 128; i++) {
        packet[3 + i] = i < data.length ? data[i] : 0x1A;
    }

    if (useCRC) {
        const crc = calculateCRC16(packet.slice(3, 3 + 128));
        packet[131] = (crc >> 8) & 0xFF;
        packet[132] = crc & 0xFF;
    } else {
        const checksum = calculateChecksum(packet.slice(3, 3 + 128));
        packet[131] = checksum;
    }

    return packet;
};
