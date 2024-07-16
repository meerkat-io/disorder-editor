/*eslint no-unused-vars: ["error", { "argsIgnorePattern": "^_" }]*/

const vscode = require('vscode')
const path = require('path')
const { Document } = require('./document')

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
		const document = Document.create(uri, openContext.backupId);

		const listeners = [];
		listeners.push(document.onDidChange.event(e => {
			this.onDidChange.fire({
				document: document,
				undo: e.redo,
				redo: e.undo,
			});
		}));

		listeners.push(document.onDidChangeDocument.event(e => {
			// Update all webviews when the document changes
			for (const webviewPanel of this.getWebviews(document.uri)) {
				this.postMessage(webviewPanel, 'update', {
					edits: e.edits,
					content: e.content,
				});
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
	 * @returns {void}
	 */
	saveCustomDocument(document, cancellation) {
		//TODO: fetch data from webview then save
		return document.save(cancellation);
	}

	/**
	 * @param {Document} document 
	 * @param {vscode.Uri} destination 
	 * @param {vscode.CancellationToken} cancellation 
	 * @returns {void}
	 */
	saveCustomDocumentAs(document, destination, cancellation) {
		//TODO: fetch data from webview then save as
		document.saveAs(destination, cancellation);
	}

	/**
	 * @param {Document} document 
	 * @param {vscode.CancellationToken} cancellation 
	 * @returns {void}
	 */
	revertCustomDocument(document, cancellation) {
		//TODO
		document.revert(cancellation);
	}

	/**
	 * @param {Document} document 
	 * @param {vscode.CustomDocumentBackupContext} context 
	 * @param {vscode.CancellationToken} cancellation 
	 * @returns {vscode.CustomDocumentBackup}
	 */
	backupCustomDocument(document, context, cancellation) {
		//TODO
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
			case 'ready':
				//TODO const editable = vscode.workspace.fs.isWritableFileSystem(document.uri.scheme);
				try {
					if (document.file.initialized === false) {
						this.postMessage(webviewPanel, 'select_schema', "empty");
					} else {
						this.postMessage(webviewPanel, 'show_datagrid', {
							type: document.file.type,
							value: document.file.value,
						});
					}
				} catch (error) {
					//TODO: show error message
				}
				return;

			case 'schema':
				try {
					const messages = document.file.loadSchema(message.body);
					if (messages.length === 0) {
						this.postMessage(webviewPanel, 'select_schema', "invalid");
					} else {
						this.postMessage(webviewPanel, 'select_message', messages);
					}
				} catch (error) {
					this.postMessage(webviewPanel, 'select_schema', "invalid");
				}
				return;

			case 'message':
				document.file.setMessage(message.body.message, message.body.container);
				document.file.write(new Map());
				this.postMessage(webviewPanel, 'show_datagrid', {
					type: document.file.type,
					value: document.file.value,
				});
				return;

			case 'edit':
				//TODO
				document.edit(message.body);
				return;
		}
	}
	//#endregion
}

module.exports = { EditorProvider }