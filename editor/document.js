/*eslint no-unused-vars: ["error", { "argsIgnorePattern": "^_" }]*/
const vscode = require('vscode')
const { File } = require('../disorder/file');

const OutMessageType = {
	UNDO: 'undo',
	REDO: 'redo',
	SAVE: 'save',
};

/**
 * @public
 * @property {vscode.Uri} uri
 * @property {File} file
 * @property {boolean} disposed
 * @property {vscode.Disposable[]} disposables
 * @property {vscode.EventEmitter<void>} onDidDispose
 * @property {vscode.EventEmitter<{content?: Uint8Array, action: string}>} onDidChangeDocument
 * @property {vscode.EventEmitter<{undo(): Promise<void>, redo(): Promise<void>}>} onDidChange
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
		 * @type {vscode.EventEmitter<{content?: Uint8Array, action: string}>}
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
	 * @returns {Document}
	 */
	static create(uri) {
		const document = new Document(uri);
		document.load();
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
		this.onDidChange.fire({
			undo: async () => {
				this.onDidChangeDocument.fire({
					action: OutMessageType.UNDO,
				});
			},
			redo: async () => {
				this.onDidChangeDocument.fire({
					action: OutMessageType.REDO,
				});
			}
		});
	}

	/**
	 * @returns {void}
	 */
	load() {
		this.file.read();
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
		this.onDidChangeDocument.fire({
			action: OutMessageType.SAVE,
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
			content: fs.readFileSync(this.uri.fsPath),
		});*/
	}

	/**
	 * @param {vscode.Uri} destination
	 * @param {vscode.CancellationToken} _cancellationToken
	 * @returns {Promise<vscode.CustomDocumentBackup>}
	 */
	async backup(destination, _cancellationToken) {
		//backup feature is disabled
		return {
			id: destination.toString(),
			delete: async () => {}
		};
	}
}

module.exports = { Document }