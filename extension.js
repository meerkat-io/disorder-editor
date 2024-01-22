const vscode = require('vscode');
const { EditorProvider } = require('./editor/editor');

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
	context.subscriptions.push(EditorProvider.register(context));
}

// This method is called when your extension is deactivated
function deactivate() { }

module.exports = { activate, deactivate }
