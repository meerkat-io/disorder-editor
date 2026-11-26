/*eslint no-unused-vars: ["error", { "argsIgnorePattern": "^_" }]*/

const vscode = require('vscode')
const { Edit } = require('./edit');
const path = require('path');
const { Schema } = require('../disorder/schema');
const { Disorder } = require('../disorder/disorder');
const { DisorderJson } = require('../disorder/json');
const { toView, rootType } = require('../disorder/view');
const { editAt, getAt, typeAt, addAt, removeAt } = require('../disorder/mutate');

/** @typedef {import('./editor').EditorProvider} EditorProvider */

/**
 * @public
 * @property {vscode.Uri} uri
 * @property {EditorProvider} editorProvider
 * @property {Uint8Array} documentData
 * @property {boolean} disposed
 * @property {vscode.Disposable[]} disposables
 * @property {Edit[]} edits
 * @property {Edit[]} savedEdits
 * @property {vscode.EventEmitter<void>} onDidDispose
 * @property {vscode.EventEmitter<{content?: Uint8Array, edits: Edit[]}>} onDidChangeDocument
 * @property {vscode.EventEmitter<{undo(): Promise<void>, redo(): Promise<void>}>} onDidChange
 */
class Document {

	/**
	 * @param {vscode.Uri} uri
	 * @param {EditorProvider} editorProvider
	 */
	constructor(uri, editorProvider) {
		/**
		 * @type {vscode.Uri}
		 */
		this.uri = uri;
		/**
		 * @type {EditorProvider}
		 */
		this.editorProvider = editorProvider;
		/**
		 * @type {Uint8Array}
		 */
		this.documentData = undefined;
		/**
		 * @type {Schema}
		 */
		this.schema = new Schema();
		/**
		 * @type {string}
		 */
		this.schemaPath = '';
		/**
		 * The live (possibly edited) content, once a file is opened or created.
		 * @type {{header: Map<string, string>, type: import('../disorder/schema').Type, value: any}|undefined}
		 */
		this.root = undefined;

		/**
		 * @type {boolean}
		 */
		this.disposed = false;
		/**
		 * @type {vscode.Disposable[]}
		 */
		this.disposables = [];
		/**
		 * @type {Edit[]}
		 */
		this.edits = [];
		/**
		 * @type {Edit[]}
		 */
		this.savedEdits = [];

		/**
		 * @type {vscode.EventEmitter<void>}
		 */
		this.onDidDispose = new vscode.EventEmitter();
		this.register(this.onDidDispose);

		/**
		 * @type {vscode.EventEmitter<{content?: Uint8Array, edits: Edit[]}>}
		 */
		this.onDidChangeDocument = new vscode.EventEmitter();
		this.register(this.onDidChangeDocument);

		/**
		 * @type {vscode.EventEmitter<{undo(): Promise<void>, redo(): Promise<void>}>}
		 */
		this.onDidChange = new vscode.EventEmitter();
		this.register(this.onDidChange);
	}

	/**
	 * @param {vscode.Uri} uri
	 * @param {string | undefined} backupId
	 * @param {EditorProvider} editorProvider
	 * @returns {Promise<Document>}
	 */
	static async create(uri, backupId, editorProvider) {
		// If we have a backup, read that. Otherwise read the resource from the workspace
		const dataFile = typeof backupId === 'string' ? vscode.Uri.parse(backupId) : uri;
		const document = new Document(uri, editorProvider);
		await document.readFile(dataFile);
		return document;
	}

	/**
	 * Decodes the existing file content: header, schema (relative to the file) and value.
	 *
	 * @returns {{message: string, container: string, schemaPath: string, root: object}}
	 */
	openExisting() {
		let header, read;
		if (this.isJson) {
			const parsed = DisorderJson.parse(this.documentData);
			header = parsed.header;
			read = type => DisorderJson.toValue(parsed.data, type);
		} else {
			const decoded = Disorder.decode(this.documentData);
			header = decoded.header;
			read = () => decoded.value;
		}
		const get = name => {
			const v = header.get(name);
			if (typeof v !== 'string' || v === '') {
				throw new Error(`file header has no "${name}"`);
			}
			return v;
		};
		const message = get('message');
		const container = get('container');
		const schema = get('schema');
		if (path.isAbsolute(schema)) {
			throw new Error(`schema path "${schema}" must be relative to the file`);
		}
		this.loadSchema(path.resolve(path.dirname(this.uri.fsPath), schema));
		const type = rootType(this.schema, message, container);
		const value = read(type);
		this.root = { header, type, value };
		return { message, container, schemaPath: this.schemaPath, root: toView(value, type) };
	}

	/**
	 * @param {Map<string, string>} header
	 * @param {import('../disorder/schema').Type} type
	 * @param {any} value
	 */
	setRoot(header, type, value) {
		this.root = { header, type, value };
	}

	/**
	 * Sets the primitive at `path` from the text typed in the grid (validated against the
	 * schema type) and records an undoable edit. A field that is not set yet gets set.
	 *
	 * @param {(string|number)[]} path
	 * @param {string} text
	 * @returns {{path: (string|number)[], node: object}} the refreshed view node (the edited
	 *   value, or the topmost field that had to be created for it)
	 */
	editValue(path, text) {
		const result = editAt(this.requireRoot().type, this.root.value, path, text);
		return result.changed ? this.mutated(result) : { path, node: toView(result.value, result.type) };
	}

	/**
	 * Adds an array item, a map entry named `key`, or the struct field `key` to the
	 * container at `path`.
	 *
	 * @param {(string|number)[]} path
	 * @param {string} [key]
	 * @returns {{path: (string|number)[], node: object}} the refreshed view node
	 */
	addValue(path, key) {
		return this.mutated(addAt(this.requireRoot().type, this.root.value, path, key));
	}

	/**
	 * Removes the array item, map entry or struct field at `path`.
	 *
	 * @param {(string|number)[]} path
	 * @returns {{path: (string|number)[], node: object}} the refreshed view node of the parent
	 */
	removeValue(path) {
		return this.mutated(removeAt(this.requireRoot().type, this.root.value, path));
	}

	/**
	 * @returns {{header: Map<string, string>, type: import('../disorder/schema').Type, value: any}}
	 */
	requireRoot() {
		if (!this.root) {
			throw new Error('no data loaded');
		}
		return this.root;
	}

	/**
	 * Records an already applied structural change as an undoable edit.
	 *
	 * @param {{path: (string|number)[], type: import('../disorder/schema').Type, undo: () => void, redo: () => void}} change
	 * @returns {{path: (string|number)[], node: object}}
	 */
	mutated({ path, type, undo, redo }) {
		this.edit({ path, type, undo, redo });
		return this.viewAt(path);
	}

	/**
	 * The view node at `path`; when the value is gone (an undone creation) its parent, which
	 * then shows the field as unset.
	 *
	 * @param {(string|number)[]} path
	 * @returns {{path: (string|number)[], node: object}}
	 */
	viewAt(path) {
		try {
			return { path, node: toView(getAt(this.root.value, path), typeAt(this.root.type, path)) };
		} catch (error) {
			if (path.length === 0) {
				throw error;
			}
			return this.viewAt(path.slice(0, -1));
		}
	}

	/**
	 * @param {vscode.Uri} [target] pass the file being written to keep the schema path
	 *   relative to it; omit for backups, which are read back relative to this document
	 * @returns {Uint8Array} the current content in this document's format
	 */
	fileData(target) {
		if (!this.root) {
			return this.documentData;
		}
		const header = new Map(this.root.header);
		if (target && path.dirname(target.fsPath) !== path.dirname(this.uri.fsPath)) {
			header.set('schema', path.relative(path.dirname(target.fsPath), this.schemaPath));
		}
		return this.encode(header, this.root.type, this.root.value);
	}

	/**
	 * @returns {boolean} true for `*.djson` files, false for the binary `*.dbin` format
	 */
	get isJson() {
		return this.uri.path.toLowerCase().endsWith('.djson');
	}

	/**
	 * @param {Map<string, string>} header
	 * @param {import('../disorder/schema').Type} type
	 * @param {any} value
	 * @returns {Uint8Array} the file content in this document's format
	 */
	encode(header, type, value) {
		return this.isJson ? DisorderJson.encode(header, type, value) : Disorder.encode(header, type, value);
	}

	/**
	 * @param {string} schemaPath
	 * @returns {string[]}
	 */
	loadSchema(schemaPath) {
		// Use a fresh Schema so a failed or earlier load cannot leak into this one.
		const schema = new Schema();
		const messages = schema.load(schemaPath);
		this.schema = schema;
		this.schemaPath = schemaPath;
		return messages;
	}

	dispose() {
		if (this.disposed) {
			return;
		}
		this.disposed = true;
		this.disposables.forEach(disposable => {
			disposable.dispose();
		});
		this.disposables = [];
		this.onDidDispose.fire();
	}

	/**
	 * @param {vscode.Disposable} value
	 */
	register(value) {
		if (this.disposed) {
			value.dispose();
		} else {
			this.disposables.push(value);
		}
	}

	/**
	 * @param {{path: (string|number)[], type: import('../disorder/schema').Type, undo: () => void, redo: () => void}} edit
	 */
	edit(edit) {
		this.edits.push(edit);
		// `edit.path` is the node whose view changed: the value itself, or its container.
		const refresh = () => this.onDidChangeDocument.fire({
			edits: this.edits,
			change: this.viewAt(edit.path),
		});
		this.onDidChange.fire({
			undo: async () => {
				this.edits.pop();
				edit.undo();
				refresh();
			},
			redo: async () => {
				this.edits.push(edit);
				edit.redo();
				refresh();
			}
		});
	}

	/**
	 * @returns {Promise<void>}
	 */
	async readFile(source = this.uri) {
		this.documentData = source.scheme === 'untitled'
			? new Uint8Array()
			: new Uint8Array(await vscode.workspace.fs.readFile(source));
	}

	/**
	 * @param {vscode.CancellationToken} cancellation
	 * @returns {Promise<void>}
	 */
	async save(cancellation) {
		await this.saveAs(this.uri, cancellation);
		this.savedEdits = Array.from(this.edits);
	}

	/**
	 * @param {vscode.Uri} targetResource
	 * @param {vscode.CancellationToken} cancellation
	 * @param {boolean} [forBackup]
	 * @returns {Promise<void>}
	 */
	async saveAs(targetResource, cancellation, forBackup = false) {
		const fileData = this.fileData(forBackup ? undefined : targetResource);
		if (cancellation.isCancellationRequested) {
			return;
		}
		await vscode.workspace.fs.writeFile(targetResource, fileData);
		if (!forBackup && targetResource.toString() === this.uri.toString()) {
			this.documentData = fileData;
		}
	}

	/**
	 * @param {vscode.CancellationToken} _cancellation
	 * @returns {Promise<void>}
	 */
	async revert(_cancellation) {
		await this.readFile();
		this.edits = Array.from(this.savedEdits);
		this.onDidChangeDocument.fire({
			content: this.documentData,
			edits: this.edits,
		});
	}

	/**
	 * @param {vscode.Uri} destination
	 * @param {vscode.CancellationToken} cancellation
	 * @returns {Promise<vscode.CustomDocumentBackup>}
	 */
	async backup(destination, cancellation) {
		await this.saveAs(destination, cancellation, true);

		return {
			id: destination.toString(),
			delete: async () => {
				try {
					await vscode.workspace.fs.delete(destination);
				} catch {
					// noop
				}
			}
		};
	}
}

module.exports = { Document }