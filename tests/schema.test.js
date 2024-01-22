const { Schema } = require('../disorder/schema');

test('load schema from yaml file', () => {
    const s = new Schema();
    s.load('./tests/data/schema.yaml');
    s.resovle();
});