# Disorder Editor

A VS Code custom editor for `*.disorder` files, the binary encoding of
[Disorder](https://github.com/meerkat-io/disorder), a strongly typed data format described by a yaml schema.

> **Status: work in progress.** The editor can create a new `.disorder` file from a schema and open existing
> ones in a read-only data grid. Editing and saving edited data are not implemented yet (see [Roadmap](#roadmap)).

## What works today

Opening an empty `*.disorder` file shows a small wizard:

1. pick a schema file (`.yaml` / `.yml`)
2. pick the root message type and a container (`none`, `array` or `map`)
3. the file is initialised with a header and an empty value

Opening a non-empty file reads its header, loads the schema it points to (path relative to the file) and shows
the value as expandable tables (struct / map / array).

The schema parser and binary codec in [`disorder/`](disorder) are a JavaScript port of the Go reference
implementation, and have no dependency on VS Code, so they can be reused on their own.

## File layout

A `.disorder` file is a header followed by one value, both in the Disorder binary encoding:

| part   | type          | content                                                                                  |
| ------ | ------------- | ---------------------------------------------------------------------------------------- |
| header | `map[string]` | `schema`: schema path relative to the file, `message`: qualified root message, `container` |
| value  | root type     | the data, written with the same tags as the header                                       |

The value is self-describing (every item carries a tag), so it can be read without the schema.

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
Disorder.write(header, type, value, 'out.disorder'); // Disorder.read('out.disorder') reads it back
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
webview first and starts an Extension Development Host), then open or create a `*.disorder` file. The webview
bundle in `webview/` is committed, so rebuild it after changing `webview-src/`.

To package and install a `.vsix`:

```
npm run package       # builds the webview, writes disorder-editor.vsix
npm run install:ext   # package + install into VS Code (needs the `code` CLI)
```

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

* editing in the data grid (it is read-only today)
* fetch edited data from the webview when saving (`EditorProvider.getFileData` is a stub)
* undo/redo, revert and backup for real edits

## License

GPL-3.0, see [LICENSE](LICENSE).
