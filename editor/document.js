/*eslint no-unused-vars: ["error", { "argsIgnorePattern": "^_" }]*/
const path = require('path')
const vscode = require('vscode')
const { File } = require('./file');
const { MessageType } = require('./message');

/**
 * @public
 * @property {vscode.Uri} uri
 * @property {File} file
 * @property {boolean} disposed
 * @property {vscode.Disposable[]} disposables
 * @property {vscode.EventEmitter<void>} onDidDispose
 * @property {vscode.EventEmitter<{undo(): void, redo(): void}>} onEdit
 * @property {vscode.EventEmitter<{action: string, body: Object}>} onExecuteAction
 */
class Document {

	/**
	 * @param {vscode.Uri} uri
	 */
	constructor(uri) {
		/**
		 * @type {vscode.Uri}
		 */
		this.uri = uri;
		/**
		 * @type {File}
		 */
		this.file = new File(uri.path);
		/**
		 * @type {boolean}
		 */
		this.disposed = false;
		/**
		 * @type {vscode.Disposable[]}
		 */
		this.disposables = [];

		/**
		 * @type {vscode.EventEmitter<{undo(): void, redo(): void}>}
		 */
		this.onEdit = new vscode.EventEmitter();
		this.register(this.onEdit);

		/**
		 * @type {vscode.EventEmitter<{action: string, body: Object}>}
		 */
		this.onExecuteAction = new vscode.EventEmitter();
		this.register(this.onExecuteAction);
	}

	/**
	 * @param {vscode.Uri} uri
	 * @param {string | undefined} backupId
	 * @returns {Promise<Document>}
	 */
	static async create(uri, backupId) {
		const document = new Document(uri);
		await document.load(backupId);
		return document;
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

	edit() {
		this.onEdit.fire({
			undo: () => {
				this.onExecuteAction.fire({
					action: MessageType.UNDO,
					body: {},
				});
			},
			redo: () => {
				this.onExecuteAction.fire({
					action: MessageType.REDO,
					body: {},
				});
			}
		});
	}

	/**
	 * @param {string | undefined} backupId
	 * @returns {Promise<void>}
	 */
	async load(backupId) {
		await this.file.load(backupId);
	}

	/**
	 * @param {vscode.Uri} targetResource
	 * @param {number} saveId
	 * @param {boolean} updateSchemaPath
	 * @returns {Promise<void>}
	 */
	async save(targetResource, saveId, updateSchemaPath) {
		let schemaPath = this.file.schemaPath;
		if (updateSchemaPath) {
			const absSchemaPath = path.join(path.dirname(this.file.filePath), this.file.schemaPath);
			schemaPath = path.relative(path.dirname(targetResource.path), absSchemaPath)
		}
		this.onExecuteAction.fire({
			action: MessageType.SAVE,
			body: { schema: schemaPath, id: saveId, file: targetResource.path },
		});
	}
}

module.exports = { Document }