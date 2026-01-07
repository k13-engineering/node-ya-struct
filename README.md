# node-ya-struct

Yet Another Node.js Structure API - A TypeScript library for defining, parsing, and formatting binary data structures with precise control over memory layout, alignment, and ABI compatibility.

## Overview

`node-ya-struct` provides a type-safe way to work with binary data structures in Node.js. It handles complex memory layout calculations including padding, alignment, and platform-specific differences (data models, endianness, compilers). The library is particularly useful for:

- Interfacing with native C libraries and system APIs
- Parsing binary file formats
- Working with hardware interfaces and low-level protocols
- Cross-platform binary data serialization

## Features

- **Type-safe definitions** - Full TypeScript support with inferred types for parsed values
- **Multiple data models** - Support for LP64 (64-bit Unix) and ILP32 (32-bit) data models
- **Packed structs** - Support for packed structures without padding
- **Endianness control** - Little and big endian support
- **Zero dependencies** - Pure TypeScript implementation

## Installation

```bash
npm install ya-struct
```

## Quick Start

```typescript
import { define, types } from "ya-struct";

// Define a struct
const def = define({
  definition: {
    type: "struct",
    packed: false,
    fixedAbi: {},
    fields: [
      { name: "a", definition: types.Int16 },
      { name: "b", definition: types.UInt16 },
      { name: "c", definition: types.UInt32 },
    ]
  }
});

// Create a parser with specific ABI settings
const parser = def.parser({
  abi: {
    endianness: "little",
    dataModel: "LP64",
    compiler: "gcc",
  }
});

// Parse binary data
const value = {
  a: 0n,
  b: 1n,
  c: 2n,
};

// Format to binary
const buffer = parser.format({ value });

// Parse back
const parsed = parser.parse({ data: buffer });
```

## API

### `define({ definition })`

Creates a struct definition that can be used to create parsers with specific ABI settings.

**Parameters:**
- `definition` - A struct definition object

**Returns:** An object with a `parser()` method

### `parser({ abi })`

Creates a parser for the defined structure with specific ABI settings.

**Parameters:**
- `abi.endianness` - `"little"` or `"big"`
- `abi.dataModel` - `"LP64"` (64-bit Unix/Linux) or `"ILP32"` (32-bit)
- `abi.compiler` - `"gcc"` (currently supported)

**Returns:** Parser object with:
- `size` - Size of the structure in bytes
- `parse({ data })` - Parse binary data to JavaScript values
- `format({ value })` - Format JavaScript values to binary data
- `layout` - Detailed memory layout information

### Built-in Types

Available via `types` export:

- **Integers:** `Int16`, `UInt16`, `Int32`, `UInt32`, `Int64`, `UInt64`
- **Strings:** `ascii({ length })` - Fixed-length null-terminated ASCII strings
- **Pointers:** `pointer` - Platform-specific pointer size

### Custom Types

You can define custom field types:

```typescript
const definition = {
  type: "struct",
  packed: false,
  fixedAbi: {},
  fields: [
    {
      name: "myField",
      definition: {
        type: "integer",
        sizeInBits: 32,
        signed: true,
        fixedAbi: {}
      }
    }
  ]
} as const;
```

Supported type kinds:
- `integer` - Custom integer with specified bit width
- `float` - Floating point numbers
- `pointer` - Pointer types
- `array` - Fixed-length arrays
- `struct` - Nested structures
- `string` - Fixed-length strings
- `c-type` - Native C types (char, int, long, etc.)

## Data Models

The library supports different C data models:

- **LP64** - Used on 64-bit Unix/Linux systems (long and pointer are 64-bit)
- **ILP32** - Used on 32-bit systems (int, long, and pointer are 32-bit)

## Packed Structures

Set `packed: true` in your struct definition to disable padding and alignment:

```typescript
const def = define({
  definition: {
    type: "struct",
    packed: true,  // No padding between fields
    fixedAbi: {},
    fields: [...]
  }
});
```
