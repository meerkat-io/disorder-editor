/*eslint no-unused-vars: ["error", { "argsIgnorePattern": "^_" }]*/

const vscode = require('vscode')
const { Edit } = require('./edit');
const path = require('path');
const { Schema } = require('../disorder/schema');
const { Disorder } = require('../disorder/disorder');
const { toView, rootType } = require('../disorder/view');

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
		const document = new Document(dataFile, editorProvider);
		await document.readFile();
		return document;
	}

	/**
	 * Decodes the existing file content: header, schema (relative to the file) and value.
	 *
	 * @returns {{message: string, container: string, schemaPath: string, root: object}}
	 */
	openExisting() {
		const { header, value } = Disorder.decode(this.documentData);
		const get = name => {
			const v = header.get(name);
			if (typeof v !== 'string' || v === '') {
				throw new Error(`file header has no "${name}"`);
			}
			return v;
		};
		const message = get('message');
		const container = get('container');
		this.loadSchema(path.resolve(path.dirname(this.uri.fsPath), get('schema')));
		const type = rootType(this.schema, message, container);
		return { message, container, schemaPath: this.schemaPath, root: toView(value, type) };
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
	 * @param {Edit} edit
	 */
	edit(edit) {
		this.edits.push(edit);
		this.onDidChange.fire({
			undo: async () => {
				this.edits.pop();
				this.onDidChangeDocument.fire({
					edits: this.edits,
				});
			},
			redo: async () => {
				this.edits.push(edit);
				this.onDidChangeDocument.fire({
					edits: this.edits,
				});
			}
		});
	}

	/**
	 * @returns {Promise<void>}
	 */
	async readFile() {
		this.documentData = this.uri.scheme === 'untitled'
			? new Uint8Array()
			: new Uint8Array(await vscode.workspace.fs.readFile(this.uri));
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
	 * @returns {Promise<void>}
	 */
	async saveAs(targetResource, cancellation) {
		const fileData = await this.editorProvider.getFileData(this);
		if (cancellation.isCancellationRequested) {
			return;
		}
		await vscode.workspace.fs.writeFile(targetResource, fileData);
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
		await this.saveAs(destination, cancellation);

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