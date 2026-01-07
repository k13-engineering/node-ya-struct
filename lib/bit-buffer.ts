type TBitBuffer = {
  sizeInBits: number;
  slice: (args: { startOffsetInBits: number, endOffsetInBits: number }) => TBitBuffer;
  readBits: (args: { offsetInBits: number, lengthInBits: number }) => { data: Uint8Array, offsetInBits: number };
}

const bitBufferFromUint8Array = ({
  data,
  offsetInBits: dataOffsetInBits,
  sizeInBits
}: {
  data: Uint8Array,
  offsetInBits: number,
  sizeInBits: number
}): TBitBuffer => {

  const slice: TBitBuffer["slice"] = ({ startOffsetInBits, endOffsetInBits }) => {
    const totalStartOffsetInBits = dataOffsetInBits + startOffsetInBits;
    const totalEndOffsetInBits = dataOffsetInBits + endOffsetInBits;

    const byteStartOffset = (totalStartOffsetInBits) / 8;
    const byteEndOffset = (totalEndOffsetInBits) / 8;

    const newData = data.slice(byteStartOffset, byteEndOffset);
    const newOffsetInBits = totalStartOffsetInBits % 8;

    return bitBufferFromUint8Array({
      data: newData,
      offsetInBits: newOffsetInBits,
      sizeInBits: endOffsetInBits - startOffsetInBits
    });
  };

  const readBits: TBitBuffer["readBits"] = ({ offsetInBits: readOffsetInBits, lengthInBits }) => {
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

  return {
    sizeInBits,
    readBits,
    slice,
  };
};

const createBitBuffer = ({ sizeInBits, offsetInBits }: { sizeInBits: number, offsetInBits: number }) => {
  const byteLength = Math.ceil(sizeInBits / 8);
  const buffer = new Uint8Array(byteLength);
  return bitBufferFromUint8Array({ data: buffer, offsetInBits, sizeInBits });
};

export {
  createBitBuffer,
  bitBufferFromUint8Array
};

export type {
  TBitBuffer
};
