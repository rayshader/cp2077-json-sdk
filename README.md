# cp2077-json-sdk
A JavaScript CLI tool to parse C++ of [RED4ext.SDK] to a custom AST format in JSON.

The purpose of this project is to import data types of the SDK into an SRE
(like [Ghidra]). An import script can be written for your SRE to add data types.

Enums, structs and classes are supported, ignoring functions. Constant values 
like `constexpr` should be evaluated when parsing. It will not interpret 
constant values when they are imported/externally referenced. In such a case,
the field `constant` will be set next to the constant name. You can evaluate
the final value with your import script.

> [!TIP]
> You can write your own import script to support specialized data types.

## Usage

1. Install [nodejs]
2. Install [pnpm]
3. Clone this repository:
```shell
git clone https://github.com/rayshader/cp2077-json-sdk.git
```
4. Pull [RED4ext.SDK] submodule:
```shell
git submodule update --init --recursive
```
5. Run `pnpm install`
6. Run `pnpm start`
7. JSON output can be found in `types/` directory.

[RED4ext.SDK]: https://github.com/wopss/RED4ext.SDK
[Ghidra]: https://ghidra-sre.org/
[nodejs]: https://nodejs.org/
[pnpm]: https://pnpm.io/

## Development

Run `pnpm dev` to develop and debug this project.

## Test

Run `pnpm test` to check unit tests with [Jest].

[Jest]: https://jestjs.io/
