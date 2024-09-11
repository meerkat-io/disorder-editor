class MessageType {
    static READY = 'ready';
    static EDIT = 'edit';
    static UNDO = 'undo';
	static REDO = 'redo';
	static SAVE = 'save';
    static REVERT = 'revert';

    static SCHEMA = 'schema';
    static MESSAGE = 'message';
    static DATAGRID = 'datagrid';
}

module.exports = { MessageType };