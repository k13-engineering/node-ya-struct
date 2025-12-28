import type { TCompiler, TDataModel, TEndianness } from "../common";

const createCStructParserFactory = ({

}: {

}) => {

    const addInteger = () => {
    };

    const addFloat = () => {
    };

    const addPointer = () => {
    };

    const addCArray = () => {
    };

    const addCStruct = () => {
    };

    const build = () => {

        const abi = () => {
        };

        return {
            abi
        };
    };

    return {
        addInteger,
        addFloat,
        addPointer,
        addCArray,
        addCStruct,
        build
    };
};

export {
    createCStructParserFactory
};
