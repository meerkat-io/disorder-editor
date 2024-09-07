/*eslint no-unused-vars: ["error", { "argsIgnorePattern": "^_" }]*/
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
 * @property {vscode.EventEmitter<{content?: Uint8Array, action: string}>} onExecuteAction
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
		 * @type {vscode.EventEmitter<void>}
		 */
		this.onDidDispose = new vscode.EventEmitter();
		this.register(this.onDidDispose);

		/**
		 * @type {vscode.EventEmitter<{undo(): void, redo(): void}>}
		 */
		this.onEdit = new vscode.EventEmitter();
		this.register(this.onEdit);

		/**
		 * @type {vscode.EventEmitter<{content?: Uint8Array, action: string}>}
		 */
		this.onExecuteAction = new vscode.EventEmitter();
		this.register(this.onExecuteAction);
	}

	/**
	 * @param {vscode.Uri} uri
	 * @returns {Promise<Document>}
	 */
	static async create(uri) {
		const document = new Document(uri);
		await document.load();
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

	edit() {
		this.onEdit.fire({
			undo: () => {
				this.onExecuteAction.fire({
					action: MessageType.UNDO,
				});
			},
			redo: () => {
				this.onExecuteAction.fire({
					action: MessageType.REDO,
				});
			}
		});
	}

	/**
	 * @returns {Promise<void>}
	 */
	async load() {
		await this.file.load();
	}

	/**
	 * @param {vscode.CancellationToken} cancellation
	 * @returns {Promise<void>}
	 */
	async save(cancellation) {
		this.saveAs(this.uri, cancellation);
	}

	/**
	 * @param {vscode.Uri} targetResource
	 * @param {vscode.CancellationToken} cancellation
	 * @returns {Promise<void>}
	 */
	async saveAs(targetResource, cancellation) {
		this.uri = targetResource;
		if (cancellation.isCancellationRequested) {
			return;
		}
		this.file.filePath = this.uri.path;
		this.onExecuteAction.fire({
			action: MessageType.SAVE,
		});
	}

	/**
	 * @param {vscode.CancellationToken} _cancellation
	 * @returns {Promise<void>}
	 */
	async revert(_cancellation) {
		this.load();
		/* TODO send revert command to webview
		this.onDidChangeDocument.fire({
			content: fs.readFileSync(this.uri.path),
		});*/
	}

	/**
	 * @param {vscode.Uri} destination
	 * @param {vscode.CancellationToken} _cancellationToken
	 * @returns {Promise<vscode.CustomDocumentBackup>}
	 */
	async backup(destination, _cancellationToken) {
		//backup feature is disabled
		//TODO: implement backup feature later
		return {
			id: destination.toString(),
			delete: async () => {}
		};
	}
}

module.exports = { Document }