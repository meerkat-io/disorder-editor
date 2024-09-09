/*eslint no-unused-vars: ["error", { "argsIgnorePattern": "^_" }]*/

const vscode = require('vscode')
const path = require('path')
const { Document } = require('./document')
const { MessageType } = require('./message');

const SchemaStatus = {
	NONE: 'none',
	LOAD: 'load',
	VALID: 'valid',
	INVALID: 'invalid',
};

/**
 * @public
 * @property {vscode.ExtensionContext} context
 * @property {Set<{resource: string, webview: vscode.WebviewPanel}>} webviews
 * @property {vscode.EventEmitter<vscode.CustomDocumentEditEvent<Document>>} onDidChange
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
		this.onDidChange = new vscode.EventEmitter();
		/**
		 * @type {vscode.Event<vscode.CustomDocumentEditEvent<Document>>}
		 */
		this.onDidChangeCustomDocument = this.onDidChange.event;
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
	 * @param {{backupId?: string}} _openContext 
	 * @param {vscode.CancellationToken} _token 
	 * @returns {Promise<Document>}
	 */
	async openCustomDocument(uri, _openContext, _token) {
		const document = await Document.create(uri);

		const listeners = [];
		listeners.push(document.onEdit.event(e => {
			this.onDidChange.fire({
				document: document,
				undo: e.undo,
				redo: e.redo,
			});
		}));

		listeners.push(document.onExecuteAction.event(e => {
			for (const webviewPanel of this.getWebviews(document.uri)) {
				this.postMessage(webviewPanel, e.action, {});
			}
		}));

		document.onDidDispose.event(() => this.disposeAll(listeners));
		return document;
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
	 * @returns {Promise<void>}
	 */
	async saveCustomDocument(document, cancellation) {
		document.save(cancellation);
	}

	/**
	 * @param {Document} document 
	 * @param {vscode.Uri} destination 
	 * @param {vscode.CancellationToken} cancellation 
	 * @returns {Promise<void>}
	 */
	async saveCustomDocumentAs(document, destination, cancellation) {
		document.saveAs(destination, cancellation);
	}

	/**
	 * @param {Document} document 
	 * @param {vscode.CancellationToken} cancellation 
	 * @returns {Promise<void>}
	 */
	async revertCustomDocument(document, cancellation) {
		document.revert(cancellation);
	}

	/**
	 * @param {Document} document 
	 * @param {vscode.CustomDocumentBackupContext} context 
	 * @param {vscode.CancellationToken} cancellation 
	 * @returns {Promise<vscode.CustomDocumentBackup>}
	 */
	async backupCustomDocument(document, context, cancellation) {
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
	onMessage(webviewPanel, document, message) {
		console.log("receive data in editor:", message)
		switch (message.command) {
			case MessageType.READY:
				//TODO const editable = vscode.workspace.fs.isWritableFileSystem(document.uri.scheme);
				if (document.file.initialized === false) {
					this.postMessage(webviewPanel, MessageType.SCHEMA, SchemaStatus.LOAD);
				} else {
					this.postMessage(webviewPanel, MessageType.DATAGRID, {
						type: document.file.type,
						content: document.file.content,
					});
				}
				break;

			case MessageType.SCHEMA:
				document.file.loadSchema(message.body).then(messages => {
					if (messages.length === 0) {
						this.postMessage(webviewPanel, MessageType.SCHEMA, SchemaStatus.INVALID);
					} else {
						this.postMessage(webviewPanel, MessageType.MESSAGE, messages);
					}
				}).catch(_error => {
					this.postMessage(webviewPanel, MessageType.SCHEMA, SchemaStatus.INVALID);
				});
				break;

			case MessageType.MESSAGE:
				document.file.setMessage(message.body.message, message.body.container);
				document.file.save();
				this.postMessage(webviewPanel, MessageType.DATAGRID, {
					type: document.file.type,
					value: document.file.content,
				});
				return;

			case MessageType.EDIT:
				document.edit();
				return;

			case MessageType.SAVE:
				const uri = vscode.Uri.parse(document.file.filePath);
				vscode.workspace.fs.writeFile(uri, message.body);
				return;
		}
	}
	//#endregion
}

module.exports = { EditorProvider }