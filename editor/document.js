/*eslint no-unused-vars: ["error", { "argsIgnorePattern": "^_" }]*/
const vscode = require('vscode')
const { File } = require('../disorder/file');

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
	 * @param {string | undefined} backupId
	 * @returns {Document}
	 */
	static create(uri, backupId) {
		// If we have a backup, read that. Otherwise read the resource from the workspace
		const filePath = typeof backupId === 'string' ? vscode.Uri.parse(backupId) : uri;
		const document = new Document(filePath);
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
					action: "undo",
				});
			},
			redo: async () => {
				this.onDidChangeDocument.fire({
					action: "redo",
				});
			}
		});
		//TODO: merge edits
		//this.edits.push(edit);
		/*
		this.onDidChange.fire({
			undo: async () => {
				this.edits.pop();
				console.log("undo", this.edits)
				this.onDidChangeDocument.fire({
					edits: this.edits,
				});
			},
			redo: async () => {
				this.edits.push(edit);
				console.log("redo", this.edits)
				this.onDidChangeDocument.fire({
					edits: this.edits,
				});
			}
		});*/
	}

	/**
	 * @returns {void}
	 */
	load() {
		this.file.read();
	}

	/**
	 * @param {vscode.CancellationToken} cancellation
	 * @returns {void}
	 */
	save(cancellation) {
		this.saveAs(this.uri, cancellation);
		this.savedEdits = Array.from(this.edits);
	}

	/**
	 * @param {vscode.Uri} targetResource
	 * @param {vscode.CancellationToken} cancellation
	 * @returns {void}
	 */
	saveAs(targetResource, cancellation) {
		//TODO: debug
		return;
		this.uri = targetResource;
		if (cancellation.isCancellationRequested) {
			return;
		}
		this.file.filePath = this.uri.path;
		this.file.write(this.file.value);
	}

	/**
	 * @param {vscode.CancellationToken} _cancellation
	 * @returns {void}
	 */
	revert(_cancellation) {
		this.load();
		this.edits = this.savedEdits;
		/* TODO
		this.onDidChangeDocument.fire({
			content: fs.readFileSync(this.uri.fsPath),
			edits: this.edits,
		});*/
	}

	/**
	 * @param {vscode.Uri} destination
	 * @param {vscode.CancellationToken} cancellation
	 * @returns {vscode.CustomDocumentBackup}
	 */
	backup(destination, cancellation) {
		this.saveAs(destination, cancellation);

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