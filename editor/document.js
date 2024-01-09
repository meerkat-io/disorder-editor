/*eslint no-unused-vars: ["error", { "argsIgnorePattern": "^_", "varsIgnorePattern": "^_" }]*/

const vscode = require('vscode')
const _editor = require('./editor')
const _edit = require('./edit')

/**
 * @class
 * @constructor
 * @public
 * @property {vscode.Uri} uri
 * @property {_editor.EditorProvider} editorProvider
 * @property {Uint8Array} documentData
 * @property {boolean} disposed
 * @property {vscode.Disposable[]} disposables
 * @property {_edit.Edit[]} edits
 * @property {_edit.Edit[]} savedEdits
 * @property {vscode.EventEmitter<void>} onDidDispose
 * @property {vscode.EventEmitter<{content?: Uint8Array, edits: edit.Edit[]}>} onDidChangeDocument
 * @property {vscode.EventEmitter<{undo(): Promise<void>, redo(): Promise<void>}>} onDidChange
 */
class Document {

    /**
     * @param {vscode.Uri} uri
     * @param {_editor.EditorProvider} editorProvider
     */
    constructor(uri, editorProvider) {
		this.uri = uri;
        this.editorProvider = editorProvider;
        this.documentData = undefined;

        this.disposed  = false;
        this.disposables = [];
		this.edits = [];
		this.savedEdits = [];

		this.onDidDispose = new vscode.EventEmitter();
		this.register(this.onDidDispose);

		this.onDidChangeDocument = new vscode.EventEmitter();
		this.register(this.onDidChangeDocument);

		this.onDidChange = new vscode.EventEmitter();
		this.register(this.onDidChange);
    }

	/**
	 * @param {vscode.Uri} uri
	 * @param {string | undefined} backupId
	 * @param {_editor.EditorProvider} editorProvider
	 * @returns {Promise<Document | PromiseLike<Document>>}
	 */
	static async create(uri, backupId, editorProvider) {
		// If we have a backup, read that. Otherwise read the resource from the workspace
		const dataFile = typeof backupId === 'string' ? vscode.Uri.parse(backupId) : uri;
		const document = new Document(dataFile, editorProvider);
		await document.readFile();
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
    register(value){
        if (this.disposed) {
            value.dispose();
        } else {
            this.disposables.push(value);
        }
    }

	/**
	 * @param {_edit.Edit} edit
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
     * @returns {Promise<Uint8Array>}
	 */
	async readFile() {
		if (this.uri.scheme === 'untitled') {
			return new Uint8Array();
		}
		return new Uint8Array(await vscode.workspace.fs.readFile(this.uri));
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
		const diskContent = await this.readFile();
		this.documentData = diskContent;
		this.edits = this.savedEdits;
		this.onDidChangeDocument.fire({
			content: diskContent,
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