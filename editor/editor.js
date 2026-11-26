/*eslint no-unused-vars: ["error", { "argsIgnorePattern": "^_" }]*/

const vscode = require('vscode')
const path = require('path')
const { Document } = require('./document')
const { toView, rootType, emptyRoot } = require('../disorder/view')

/**
 * @public
 * @property {vscode.ExtensionContext} context
 * @property {Set<{resource: string, webview: vscode.WebviewPanel}>} webviews
 * @property {vscode.EventEmitter<vscode.CustomDocumentEditEvent<Document>>} onDidChange
 * @property {Map<number, (response: any) => void>} callbacks
 */
class EditorProvider {
	/**
	 * @param {vscode.ExtensionContext} context
	 */
	constructor(context) {
		/**
		 * @type {vscode.ExtensionContext}
		 */
		this.context = context;
		/**
		 * @type {Set<{resource: string, webview: vscode.WebviewPanel}>}
		 */
		this.webviews = new Set();
		/**
		 * @type {vscode.EventEmitter<vscode.CustomDocumentEditEvent<Document>>}
		 */
		this.emitter = new vscode.EventEmitter();
		/**
		 * VS Code listens to this exact name: it drives the dirty marker and undo/redo.
		 */
		this.onDidChangeCustomDocument = this.emitter.event;
		/**
		 * @type {Map<number, (response: any) => void>}
		 */
		this.callbacks = new Map();
	}

	/**
	 * @param {vscode.ExtensionContext} context
	 * @returns {vscode.Disposable}
	 */
	static register(context) {
		return vscode.window.registerCustomEditorProvider(
			'disorder.data',
			new EditorProvider(context),
			{
				webviewOptions: {
					retainContextWhenHidden: true,
				},
				supportsMultipleEditorsPerDocument: false,
			});
	}

	//#region CustomEditorProvider
	/**
	 * @param {vscode.Uri} uri 
	 * @param {{backupId?: string}} openContext 
	 * @param {vscode.CancellationToken} _token 
	 * @returns {Promise<Document>}
	 */
	async openCustomDocument(uri, openContext, _token) {
		const doc = await Document.create(uri, openContext.backupId, this);

		const listeners = [];
		listeners.push(doc.onDidChange.event(e => {
			this.emitter.fire({
				document: doc,
				undo: e.undo,
				redo: e.redo,
			});
		}));

		listeners.push(doc.onDidChangeDocument.event(e => {
			// Undo/redo changes one value; a revert reloads everything.
			for (const webviewPanel of this.getWebviews(doc.uri)) {
				if (e.change) {
					this.postMessage(webviewPanel, 'update_node', e.change);
				} else if (e.content) {
					this.showDocument(webviewPanel, doc);
				}
			}
		}));

		doc.onDidDispose.event(() => this.disposeAll(listeners));
		return doc;
	}

	/**
	 * @param {Document} document 
	 * @param {vscode.WebviewPanel} webviewPanel 
	 * @param {vscode.CancellationToken} _token
	 * @returns {Promise<void>}
	 */
	async resolveCustomEditor(document, webviewPanel, _token) {
		this.addWebview(document.uri, webviewPanel);
		webviewPanel.webview.options = {
			enableScripts: true,
		};
		webviewPanel.webview.html = this.getHtmlForWebview(webviewPanel);
		webviewPanel.webview.onDidReceiveMessage(e => this.onMessage(webviewPanel, document, e));
	}

	/**
	 * @param {Document} document 
	 * @param {vscode.CancellationToken} cancellation 
	 * @returns {Thenable<void>}
	 */
	saveCustomDocument(document, cancellation) {
		return document.save(cancellation);
	}

	/**
	 * @param {Document} document 
	 * @param {vscode.Uri} destination 
	 * @param {vscode.CancellationToken} cancellation 
	 * @returns {Thenable<void>}
	 */
	saveCustomDocumentAs(document, destination, cancellation) {
		return document.saveAs(destination, cancellation);
	}

	/**
	 * @param {Document} document 
	 * @param {vscode.CancellationToken} cancellation 
	 * @returns {Thenable<void>}
	 */
	revertCustomDocument(document, cancellation) {
		return document.revert(cancellation);
	}

	/**
	 * @param {Document} document 
	 * @param {vscode.CustomDocumentBackupContext} context 
	 * @param {vscode.CancellationToken} cancellation 
	 * @returns {Thenable<vscode.CustomDocumentBackup>}
	 */
	backupCustomDocument(document, context, cancellation) {
		return document.backup(context.destination, cancellation);
	}
	//#endregion

	/**
	 * @param {vscode.Uri} uri
	 * @param {vscode.WebviewPanel} webview
	 * @private
	 */
	addWebview(uri, webview) {
		const entry = {
			resource: uri.toString(),
			webview: webview
		}
		this.webviews.add(entry);
		webview.onDidDispose(() => {
			this.webviews.delete(entry);
		});
	}

	/**
	 * @param {vscode.Uri} uri
	 * @returns {Iterable<vscode.WebviewPanel>}
	 * @private
	 */
	*getWebviews(uri) {
		const key = uri.toString();
		for (const entry of this.webviews) {
			if (entry.resource === key) {
				yield entry.webview;
			}
		}
	}

	/**
	 * @param {vscode.WebviewPanel} webviewPanel
	 * @private
	 */
	getHtmlForWebview(webviewPanel) {
		const webview = webviewPanel.webview;
		const appUri = webview.asWebviewUri(vscode.Uri.file(
			path.join(this.context.extensionPath, 'webview', 'js', 'app.js')
		))
		const cssUri = webview.asWebviewUri(vscode.Uri.joinPath(
			this.context.extensionUri, 'webview', 'css', 'app.css'));
		const chunkVendorsUri = webview.asWebviewUri(vscode.Uri.joinPath(
			this.context.extensionUri, 'webview', 'js', 'chunk-vendors.js'));

		// Use a nonce to whitelist which scripts can be run */
		const nonce = this.getNonce();

		return /* html */`
			<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="utf-8">
				<meta name="viewport" content="width=device-width,initial-scale=1.0">
				<meta http-equiv="Content-Security-Policy"
					content="default-src 'none';
					style-src ${webviewPanel.webview.cspSource};
					script-src 'nonce-${nonce}';"
				/>
				<link href="${cssUri}" rel="stylesheet"/>
				<title>Disorder Editor</title>
			</head>
			<body>
				<div id="app"></div>
				<script nonce="${nonce}" src="${chunkVendorsUri}"></script>
				<script nonce="${nonce}" src="${appUri}"></script>
			</body>
			</html>`;
	}

	/**
	 * @returns {string}
	 * @private
	 */
	getNonce() {
		let text = '';
		const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
		for (let i = 0; i < 32; i++) {
			text += possible.charAt(Math.floor(Math.random() * possible.length));
		}
		return text;
	}

	/**
	 * @param {vscode.Disposable[]} disposables 
	 * @private
	 */
	disposeAll(disposables) {
		while (disposables.length) {
			const item = disposables.pop();
			if (item) {
				item.dispose();
			}
		}
	}

	//#region Comunication with webview
	/**
	 * @param {vscode.WebviewPanel} panel 
	 * @param {string} command 
	 * @param {*} body 
	 * @private
	 */
	postMessage(panel, command, body) {
		panel.webview.postMessage({ command, body });
	}

	/**
	 * @param {vscode.WebviewPanel} webviewPanel 
	 * @param {Document} document 
	 * @param {{command: string, body: any}} message 
	 * @private
	 */
	async onMessage(webviewPanel, document, message) {
		try {
			await this.handleMessage(webviewPanel, document, message);
		} catch (error) {
			vscode.window.showErrorMessage(`Disorder editor error: ${error.message}`);
			this.postMessage(webviewPanel, 'show_error', error.message);
		}
	}

	/**
	 * @param {vscode.WebviewPanel} webviewPanel
	 * @param {Document} document
	 * @param {{command: string, body: any}} message
	 * @private
	 */
	async handleMessage(webviewPanel, document, message) {
		switch (message.command) {
			case 'ready':
				this.showDocument(webviewPanel, document);
				return;

			case 'pick_schema':
				return this.pickSchema(webviewPanel, document);

			case 'message': {
				try {
					const { message: name, container } = message.body;
					if (!document.schemaPath) {
						throw new Error('no schema selected');
					}
					const header = new Map([
						['schema', path.relative(path.dirname(document.uri.fsPath), document.schemaPath)],
						['message', name],
						['container', container],
					]);
					const type = rootType(document.schema, name, container);
					const value = emptyRoot(container);
					const bytes = document.encode(header, type, value);
					await vscode.workspace.fs.writeFile(document.uri, bytes);
					document.documentData = bytes;
					document.setRoot(header, type, value);
					this.postMessage(webviewPanel, 'show_datagrid', {
						message: name,
						container,
						schemaPath: document.schemaPath,
						root: toView(value, type),
					});
				} catch (error) {
					vscode.window.showErrorMessage(`Cannot create file: ${error.message}`);
					this.postMessage(webviewPanel, 'show_error', error.message);
				}
				return;
			}

			case 'edit':
			case 'add':
			case 'remove': {
				// Answered with the refreshed node (the value, or the container for add/remove) or an error.
				const { id, path: valuePath, text, key } = message.body;
				try {
					let result;
					if (message.command === 'edit') {
						result = document.editValue(valuePath, text);
					} else if (message.command === 'add') {
						result = document.addValue(valuePath, key);
					} else {
						result = document.removeValue(valuePath);
					}
					this.postMessage(webviewPanel, 'edit_result', { id, ...result });
				} catch (error) {
					this.postMessage(webviewPanel, 'edit_result', { id, error: error.message });
				}
				return;
			}
		}
	}
	//#endregion

	/**
	 * Shows the file content, the new-file wizard for an empty file, or the error.
	 *
	 * @param {vscode.WebviewPanel} webviewPanel
	 * @param {Document} document
	 * @private
	 */
	showDocument(webviewPanel, document) {
		if (document.documentData.length === 0) {
			this.postMessage(webviewPanel, 'select_schema', 'empty');
			return;
		}
		try {
			this.postMessage(webviewPanel, 'show_datagrid', document.openExisting());
		} catch (error) {
			vscode.window.showErrorMessage(`Cannot open ${path.basename(document.uri.fsPath)}: ${error.message}`);
			this.postMessage(webviewPanel, 'show_error', error.message);
		}
	}

	/**
	 * @param {vscode.WebviewPanel} webviewPanel
	 * @param {Document} document
	 * @private
	 */
	async pickSchema(webviewPanel, document) {
		const files = await vscode.window.showOpenDialog({
			canSelectMany: false,
			defaultUri: vscode.Uri.joinPath(document.uri, '..'),
			filters: { 'Disorder schema': ['yaml', 'yml'] },
			openLabel: 'Select schema',
		});
		if (!files || files.length === 0) {
			return;
		}
		try {
			const messages = document.loadSchema(files[0].fsPath);
			if (messages.length === 0) {
				throw new Error('schema defines no messages');
			}
			this.postMessage(webviewPanel, 'select_message', messages);
		} catch (error) {
			vscode.window.showErrorMessage(`Invalid schema: ${error.message}`);
			this.postMessage(webviewPanel, 'select_schema', 'invalid');
		}
	}
}

module.exports = { EditorProvider }