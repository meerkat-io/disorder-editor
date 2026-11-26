# Disorder Editor

A VS Code custom editor for [Disorder](https://github.com/meerkat-io/disorder) data files, a strongly typed data format
described by a yaml schema. Two file types are supported: `*.dbin` (binary) and `*.djson` (JSON).

## Features

* Open `*.dbin` and `*.djson` files in an editable data grid (struct / map / array shown as expandable tables).
* Create a new file: open an empty `*.dbin` or `*.djson` file to get a wizard that asks for a schema (`.yaml` / `.yml`),
  the root message type and a container (`none`, `array` or `map`).
* Edit values in place, checked against the schema:

  | type      | editor                                                                          |
  | --------- | ------------------------------------------------------------------------------- |
  | int, long, float, double | text input, validated on Enter / blur (range and format)         |
  | string    | multi-line text area (Enter = newline, Ctrl/Cmd+Enter or leaving the field saves) |
  | bool      | radio buttons                                                                   |
  | enum      | select                                                                          |
  | timestamp | native date-time picker (UTC, millisecond precision) and a "now" button         |
  | bytes     | base64 text                                                                     |

  Enter or leaving the field commits, `Esc` cancels, and an invalid value shows an error next to the field.
* Add and remove structure: `+ add` on arrays (appends an item) and maps (asks for the key), and `×` on a row to
  remove an array item or map entry.
* Struct fields that are not in the file show their default value (`0`, empty string, first enum value, `false`, empty
  struct/array/map), dimmed. Editing one sets it; `×` on a set field unsets it again. Dimmed means "not in the file"; a
  field you set to the default value is shown at full brightness and is written to the file.
* Standard VS Code behaviour: unsaved-changes marker on the tab, Save, Save As, undo/redo, revert and hot-exit backup.
  Saving writes the edited value back in the same format. Save As to another folder rewrites the relative `schema` path.

Limitations: map keys cannot be renamed, array items cannot be reordered or duplicated, and
the schema `option` block is not interpreted.

The schema parser and binary codec in [`disorder/`](disorder) are a JavaScript port of the Go reference
implementation, and have no dependency on VS Code, so they can be reused on their own.

## File layout

A `.dbin` file is a header followed by one value, both in the Disorder binary encoding:

| part   | type          | content                                                                                  |
| ------ | ------------- | ---------------------------------------------------------------------------------------- |
| header | `map[string]` | `schema`: schema path relative to the file, `message`: qualified root message, `container` |
| value  | root type     | the data, written with the same tags as the header                                       |

The value is self-describing (every item carries a tag), so it can be read without the schema.

## JSON files (`*.djson`)

The JSON flavour carries the same header as the binary one, followed by the data. It is not self-describing, so it
can only be read together with its schema, which must be a path relative to the file:

```json
{
  "schema": "schema.yaml",
  "message": "test.data",
  "container": "none",
  "data": { "number_data": 42, "string_data": "hello" }
}
```

`long` is a decimal string (JS numbers lose precision above 2^53), `bytes` is base64, `timestamp` is ISO 8601, and
struct/map are both objects (the schema tells them apart). Unknown keys, unknown struct fields and values that do not
match the schema are rejected with the location of the problem (for example `data.items[2].count: expected a 32-bit int`).
If a file, its schema or its data is invalid, the editor shows the error in the page and as a notification.

## Binary format

| type      | tag   | format                                                   |
| --------- | ----- | -------------------------------------------------------- |
| bool      | 1     | tag + 1 byte (0/1)                                       |
| int       | 2     | tag + 32 bit big-endian int                              |
| long      | 3     | tag + 64 bit big-endian int                              |
| float     | 4     | tag + 32 bit float                                       |
| double    | 5     | tag + 64 bit float                                       |
| bytes     | 6     | tag + 4 byte length + raw bytes                          |
| string    | 11    | tag + 4 byte length (in UTF-8 **bytes**) + UTF-8 bytes   |
| timestamp | 12    | tag + 64 bit int, unix time in milliseconds              |
| enum      | 13    | tag + short string                                       |
| array     | 21/22 | start + [tag + data] + end                               |
| object    | 23/24 | start + [tag + key (short string) + data] + end          |

A short string is 1 byte length + UTF-8 bytes (max 255 bytes). See the
[Disorder README](https://github.com/meerkat-io/disorder#binary-format) for the full specification and the
schema format.

## JavaScript API

```js
const { Schema } = require('./disorder/schema');
const { Writer, Reader } = require('./disorder/binary');
const { Disorder } = require('./disorder/disorder');

// schema: returns the messages defined in the file (imports are loaded too)
const schema = new Schema();
const messages = schema.load('./tests/data/schema.yaml'); // ['test.object', 'test.data']
const type = schema.getMessage('test.data');

// values: struct/map -> Map, array -> Array, long -> bigint, timestamp -> Date, bytes -> Uint8Array
const value = new Map([['number_data', 1], ['string_data', 'hello']]);

// low-level codec
const writer = new Writer();
writer.write(value, type);
const copy = Reader.fromWriter(writer).read();

// whole files: header + value
const bytes = Disorder.encode(new Map([['message', 'test.data']]), type, value);
const { header, value: decoded } = Disorder.decode(bytes);
Disorder.write(header, type, value, 'out.dbin'); // Disorder.read('out.dbin') reads it back
```

Notes:

* `Writer` validates values against the type (ranges for `int`/`long`, enum members, and so on) and throws on mismatch.
  Struct fields missing from the `Map` are omitted.
* `Reader` throws on truncated data or unknown tags.
* Like the Go implementation, map keys are written sorted by their UTF-8 bytes (so output is canonical and does
  not depend on `Map` insertion order), empty map keys are rejected, and unknown top-level schema keys
  (for example the removed `services`) are rejected. The `option` block is accepted but not interpreted.

## Development

```
npm install
npm test          # lint, then jest
npm run build     # bundle the webview (vue-cli) into webview/
```

To try the extension, open this folder in VS Code and press `F5` (the "Run Extension" launch config builds the
webview first and starts an Extension Development Host), then open or create a `*.dbin` file. The webview
bundle in `webview/` is committed, so rebuild it after changing `webview-src/`.

To package and install a `.vsix`:

```
./install.sh          # npm ci, tests, build, pack disorder-editor-<version>.vsix, install into VS Code
```

The script finds the `code` CLI on `PATH` or in `/Applications/Visual Studio Code.app`; set `CODE_CLI` to override.
`npm run package` only builds the `.vsix`.

`.vscodeignore` keeps tests and webview sources out of the package; only `js-yaml` is shipped from
`node_modules` (build tools such as `vue` and `@vue/cli` are dev dependencies).

Layout:

| path           | content                                                          |
| -------------- | ---------------------------------------------------------------- |
| `disorder/`    | schema parser (`schema.js`), binary codec (`binary.js`), file IO (`disorder.js`) |
| `editor/`      | VS Code custom editor provider and document model                |
| `webview-src/` | Vue 3 source of the editor UI                                    |
| `tests/`       | jest tests and sample schemas in `tests/data`                    |

## Roadmap

* rename map keys, reorder / duplicate array items
* interpret the schema `option` block

## License

MIT, see [LICENSE](LICENSE).
