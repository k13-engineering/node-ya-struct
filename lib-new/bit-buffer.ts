interface IBitBuffer {
    sizeInBits: number;
    slice: (args: { startOffsetInBits: number, endOffsetInBits: number }) => IBitBuffer;
    readBits: (args: { offsetInBits: number, lengthInBits: number }) => { data: Uint8Array, offsetInBits: number };
    toUint8Array: () => Uint8Array;
}

const fromUint8Array = ({
    data,
    offsetInBits: dataOffsetInBits,
    sizeInBits
} : {
    data: Uint8Array,
    offsetInBits: number,
    sizeInBits: number
}) : IBitBuffer => {

    const slice : IBitBuffer["slice"] = ({ startOffsetInBits, endOffsetInBits }) => {
        const totalStartOffsetInBits = dataOffsetInBits + startOffsetInBits;
        const totalEndOffsetInBits = dataOffsetInBits + endOffsetInBits;

        const byteStartOffset = (totalStartOffsetInBits) / 8;
        const byteEndOffset = (totalEndOffsetInBits) / 8;

        const newData = data.slice(byteStartOffset, byteEndOffset);
        const newOffsetInBits = totalStartOffsetInBits % 8;

        return fromUint8Array({
            data: newData,
            offsetInBits: newOffsetInBits,
            sizeInBits: endOffsetInBits - startOffsetInBits
        });
    };

    const readBits : IBitBuffer["readBits"] = ({ offsetInBits: readOffsetInBits, lengthInBits }) => {
        const totalOffsetInBits = dataOffsetInBits + readOffsetInBits;
        const totalEndOffsetInBits = totalOffsetInBits + lengthInBits;

        const byteOffset = (totalOffsetInBits) / 8;
        const byteEndOffset = (totalEndOffsetInBits) / 8;

        const bitData = data.slice(byteOffset, byteEndOffset);
        const bitOffset = totalOffsetInBits % 8;

        return {
            offsetInBits: bitOffset,
            data: bitData
        };
    };

    const toUint8Array = () => {
        return data;
    };

    return {
        sizeInBits,
        readBits,
        slice,
        toUint8Array
    };
};

const create = ({ sizeInBits } : { sizeInBits: number }) => {
    const byteLength = Math.ceil(sizeInBits / 8);
    const buffer = new Uint8Array(byteLength);
    return fromUint8Array({ data: buffer, offsetInBits: 0, sizeInBits });
};

export {
    create,
    fromUint8Array
};

export type {
    IBitBuffer
};
