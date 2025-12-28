import marshaller from "../lib/marshaller";

type FieldMap = Record<string, any>;

type IntegerField<Name extends string> = {
  [K in Name]: bigint;
};

const createBuilder = <T extends FieldMap> ({ fields }: { fields: string[] }) => {
    const UInt32 = <Name extends string>(options: { name: Name }) => {
        return createBuilder<T & IntegerField<Name>>({
            fields: [...fields, options.name]
        });
    };

    const parse = ({ data }: { data: Buffer }): T => {
        const result: any = {};
        return result;
    };

    return {
        UInt32,

        parse
    };
};

builder.addField({ name: "field1", parser: UInt32({ dataModel, endianness, compiler }) });

builder.addField({ field: UInt32({ name: 'field1' }) });
builder.maybeAddField({ field: { name: 'field2' }, condition: true });

const builder = createBuilder<{ }>( { fields: []  } );

let b = builder.UInt32({ name: 'field1' });
b.UInt32({ name: 'field2', condition: true });

b.UInt32({ name: 'field3' });

const result = b.parse({ data: Buffer.alloc(8) });

const createStruct = (builder) => {
    const fields = builder({ field: fieldFactory() });
};


const struct = createStruct(({ field }) => {
    let f = field.UInt32({ name: 'test' });
    f = field.UInt32({ name: 'test2' });
});

const parsedStruct = struct.parse({ data: Buffer.alloc(8) });
