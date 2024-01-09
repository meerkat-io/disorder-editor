const vscode = require('vscode');
const editor = require('./editor/editor');

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
	let disposable = vscode.commands.registerCommand('disorder-editor.hey', () => {
		// The code you place here will be executed every time your command is executed

		// Display a message box to the user
		vscode.window.showInformationMessage('How are you!');
	});

	context.subscriptions.push(disposable);

	context.subscriptions.push(editor.EditorProvider.register(context));
}

// This method is called when your extension is deactivated
function deactivate() { }

module.exports = { activate, deactivate }
