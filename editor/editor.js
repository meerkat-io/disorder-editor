/*eslint no-unused-vars: ["error", { "argsIgnorePattern": "^_" }]*/

const vscode = require('vscode')
const document = require('./document')

/**
 * @class
 * @constructor
 * @public
 * @property {vscode.ExtensionContext} context
 * @property {Set<{resource: string, webview: vscode.WebviewPanel}>} webviews
 * @property {vscode.EventEmitter<vscode.CustomDocumentEditEvent<document.Document>>} onDidChangeCustomDocument
 * @property {number} requestId
 * @property {Map<number, (response: any) => void>} callbacks
 */
class EditorProvider {
	/**
	 * @param {vscode.ExtensionContext} context
	 */
	constructor(context) {
		this.context = context;
		this.webviews = new Set();
		this.onDidChangeCustomDocument = new vscode.EventEmitter();
		this.requestId = 1;
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

	/**
	 * @param {vscode.Uri} uri
	 * @param {vscode.WebviewPanel} webview 
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
	 * 
	 * @param {document.Document} _doc 
	 */
	async getFileData(_doc) {
		return new Uint8Array();
	}

	/*
	getFileData(Document): async () => {
					const webviewsForDocument = Array.from(this.webviews.get(document.uri));
					if (!webviewsForDocument.length) {
						throw new Error('Could not find webview to save for');
					}
					const panel = webviewsForDocument[0];
					const response = await this.postMessageWithResponse<number[]>(panel, 'getFileData', {});
					return new Uint8Array(response);
				}*/

	//#region CustomEditorProvider
	/**
	 * @param {vscode.Uri} uri 
	 * @param {{backupId?: string}} openContext 
	 * @param {vscode.CancellationToken} _token 
	 * @returns {Promise<document.Document>}
	 */
	async openCustomDocument(uri, openContext, _token) {
		const doc = await document.Document.create(uri, openContext.backupId, this);

		const listeners = [];
		listeners.push(doc.onDidChange.event(e => {
			// Tell VS Code that the document has been edited by the use.
			this.onDidChangeCustomDocument.fire({
				doc,
				...e,
			});
		}));

		listeners.push(doc.onDidChangeDocument.event(e => {
			// Update all webviews when the document changes
			for (const webviewPanel of this.getWebviews(doc.uri)) {
				this.postMessage(webviewPanel, 'update', {
					edits: e.edits,
					content: e.content,
				});
			}
		}));

		doc.onDidDispose.event(() => this.disposeAll(listeners));
		return doc;
	}

	/**
	 * @param {document.Document} document 
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
	 * @param {document.Document} document 
	 * @param {vscode.CancellationToken} cancellation 
	 * @returns {Thenable<void>}
	 */
	saveCustomDocument(document, cancellation) {
		return document.save(cancellation);
	}

	/**
	 * @param {document.Document} document 
	 * @param {vscode.Uri} destination 
	 * @param {vscode.CancellationToken} cancellation 
	 * @returns {Thenable<void>}
	 */
	saveCustomDocumentAs(document, destination, cancellation) {
		return document.saveAs(destination, cancellation);
	}

	/**
	 * @param {document.Document} document 
	 * @param {vscode.CancellationToken} cancellation 
	 * @returns {Thenable<void>}
	 */
	revertCustomDocument(document, cancellation) {
		return document.revert(cancellation);
	}

	/**
	 * @param {document.Document} document 
	 * @param {vscode.CustomDocumentBackupContext} context 
	 * @param {vscode.CancellationToken} cancellation 
	 * @returns {Thenable<vscode.CustomDocumentBackup>}
	 */
	backupCustomDocument(document, context, cancellation) {
		return document.backup(context.destination, cancellation);
	}
	//#endregion

	/**
	 * @param {vscode.WebviewPanel} webviewPanel
	 */
	getHtmlForWebview(webviewPanel) {
		const webview = webviewPanel.webview;
		const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(
			this.context.extensionUri, 'webview', 'main.js'));
		const cssUri = webview.asWebviewUri(vscode.Uri.joinPath(
			this.context.extensionUri, 'webview', 'app.css'));

		// Use a nonce to whitelist which scripts can be run */
		const nonce = this.getNonce();

		return /* html */`
			<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">

				<!--
				Use a content security policy to only allow loading images from https or from our extension directory,
				and only allow scripts that have a specific nonce.
				-->
				<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource} blob:; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">

				<link href="${cssUri}" rel="stylesheet"/>

				<title>Disorder Editor</title>
			</head>
			<body>
				Custom Editor
				<!--
				<script nonce="${nonce}" src="${scriptUri}"></script>
				-->
			</body>
			</html>`;
	}

	/**
	 * @returns {string}
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
	 * @param {string} type 
	 * @param {*} body 
	 */
	postMessage(panel, type, body) {
		const requestId = this.requestId++;
		const promise = new Promise(resolve => this.callbacks.set(requestId, resolve));
		panel.webview.postMessage({ type: type, requestId: requestId, body: body });
		return promise;
	}

	/**
	 * @param {vscode.WebviewPanel} webviewPanel 
	 * @param {document.Document} document 
	 * @param {{type: string, requestId: number, body: any}} message 
	 * @returns 
	 */
	onMessage(webviewPanel, document, message) {
		switch (message.type) {
			case 'ready':
				if (document.uri.scheme === 'untitled') {
					this.postMessage(webviewPanel, 'init', {
						untitled: true,
						editable: true,
					});
				} else {
					const editable = vscode.workspace.fs.isWritableFileSystem(document.uri.scheme);

					this.postMessage(webviewPanel, 'init', {
						value: document.documentData,
						editable,
					});
				}
				return;

			case 'edit':
				document.edit(message.body);
				return;

			// TO-DO
			case 'response':
				const callback = this.callbacks.get(message.requestId);
				callback?.(message.body);
				return;
		}
	}
	//#endregion
}

module.exports = { EditorProvider }