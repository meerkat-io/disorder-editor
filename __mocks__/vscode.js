// __mocks__/vscode.js
const fs = require('fs').promises;
const { TextEncoder } = require('util');

module.exports = {
    Uri: {
        file: jest.fn((path) => ({
            path: path,
            toString: () => `file://${path}`,
        })),
        parse: jest.fn((path) => ({
            path: path,
            toString: () => `file://${path}`,
        })),
    },
    // Mock the parts of the vscode module that you use in your tests
    workspace: {
        fs: {
            isWritableFileSystem: jest.fn().mockReturnValue(true),
            readFile: jest.fn(async (uri) => {
                try {
                  const data = await fs.readFile(uri.path);
                  const encoder = new TextEncoder();
                  return encoder.encode(data.toString());
                } catch (error) {
                  return Promise.reject(error);
                }
              }),
        },
    },
    window: {
        showInformationMessage: jest.fn(),
        showErrorMessage: jest.fn(),
    },
    // Add other mocks as needed
};