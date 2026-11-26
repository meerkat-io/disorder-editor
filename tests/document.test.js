const path = require('path');
const fs = require('fs');

jest.mock('vscode', () => {
    class EventEmitter {
        constructor() { this.listeners = []; this.event = fn => { this.listeners.push(fn); return { dispose() {} }; }; }
        fire(e) { this.listeners.forEach(fn => fn(e)); }
        dispose() {}
    }
    return { EventEmitter, workspace: { fs: { readFile: async () => new Uint8Array(), writeFile: async () => {} } } };
}, { virtual: true });

const { Document } = require('../editor/document');

const open = file => {
    const doc = new Document({ path: file, fsPath: file, scheme: 'file', toString: () => file }, {});
    doc.documentData = new Uint8Array(fs.readFileSync(file));
    doc.openExisting();
    return doc;
};
const dataDir = path.join(__dirname, 'data');

describe.each(['sample.djson', 'sample.dbin'])('editing %s', name => {
    test('edit, save and undo', async () => {
        const doc = open(path.join(dataDir, name));
        const changes = [];
        doc.onDidChangeDocument.event(e => changes.push(e.change));
        let history;
        doc.onDidChange.event(e => { history = e; });

        expect(doc.editValue(['number_data'], '99')).toEqual({ path: ['number_data'], node: { t: 'int', v: 99 } });
        expect(() => doc.editValue(['number_data'], 'oops')).toThrow('expected a number');
        expect(doc.editValue(['color_data'], 'blue').node).toMatchObject({ t: 'enum', v: 'blue' });

        // the saved bytes reopen with the edited values
        const reopened = new Document(doc.uri, {});
        reopened.documentData = doc.fileData(doc.uri);
        const view = reopened.openExisting().root;
        const field = key => view.fields.find(f => f.key === key).node.v;
        expect(field('number_data')).toBe(99);
        expect(field('color_data')).toBe('blue');
        expect(field('string_data')).toBe('hello');

        await history.undo();
        expect(changes[changes.length - 1]).toEqual({ path: ['color_data'], node: expect.objectContaining({ v: 'red' }) });
        await history.redo();
        expect(doc.root.value.get('color_data')).toBe('blue');
        expect(doc.edits).toHaveLength(2);
    });

    test('an unchanged value is not an edit', () => {
        const doc = open(path.join(dataDir, name));
        doc.editValue(['number_data'], '42');
        expect(doc.edits).toHaveLength(0);
    });
});

describe.each(['sample.djson', 'sample.dbin'])('structure of %s', name => {
    const reopen = doc => {
        const copy = new Document(doc.uri, {});
        copy.documentData = doc.fileData(doc.uri);
        return copy.openExisting().root;
    };

    test('unset and set a field, with undo', async () => {
        const doc = open(path.join(dataDir, name));
        let history;
        doc.onDidChange.event(e => { history = e; });
        const changes = [];
        doc.onDidChangeDocument.event(e => changes.push(e.change));

        const removed = doc.removeValue(['string_data']);
        expect(removed.path).toEqual([]);
        expect(removed.node.fields.find(f => f.key === 'string_data').node).toEqual({ t: 'string', v: '', unset: true });
        expect(reopen(doc).fields.find(f => f.key === 'string_data').node).toMatchObject({ unset: true });

        await history.undo();
        expect(changes[changes.length - 1].node.fields.find(f => f.key === 'string_data').node).toEqual({ t: 'string', v: 'hello' });

        await history.redo();
        const added = doc.addValue([], 'string_data');
        expect(added.node.fields.find(f => f.key === 'string_data').node).toEqual({ t: 'string', v: '' });
        expect(reopen(doc).fields.find(f => f.key === 'string_data').node).toEqual({ t: 'string', v: '' });
        expect(doc.edits).toHaveLength(2);
    });
});

test.each(['sample.djson', 'sample.dbin'])('editing an unset field sets it (%s)', async name => {
    const doc = open(path.join(dataDir, name));
    let history;
    doc.onDidChange.event(e => { history = e; });
    doc.removeValue(['string_data']);
    expect(doc.editValue(['string_data'], 'again').node).toEqual({ t: 'string', v: 'again' });
    expect(doc.root.value.get('string_data')).toBe('again');
    await history.undo();
    expect(doc.root.value.has('string_data')).toBe(false);
});

test('saving elsewhere rewrites the relative schema path, backups do not', () => {
    const doc = open(path.join(dataDir, 'sample.djson'));
    const elsewhere = { fsPath: path.join(dataDir, 'sub', 'copy.djson') };
    expect(JSON.parse(Buffer.from(doc.fileData(elsewhere)))).toMatchObject({ schema: '../schema.yaml' });
    expect(JSON.parse(Buffer.from(doc.fileData()))).toMatchObject({ schema: 'schema.yaml' });
});
