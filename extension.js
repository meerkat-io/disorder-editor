/*eslint no-unused-vars: ["error", { "argsIgnorePattern": "^_", "varsIgnorePattern": "^_" }]*/

const _vscode = require('vscode');
const editor = require('./editor/editor')

/**
 * @param {_vscode.ExtensionContext} context
 */
function activate(context) {
	context.subscriptions.push(editor.EditorProvider.register(context));
}

// This method is called when your extension is deactivated
function deactivate() {}

module.exports = {
	activate,
	deactivate
}
