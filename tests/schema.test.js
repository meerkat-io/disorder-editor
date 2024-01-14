const schema = require('../disorder/schema');

test('load schema from yaml file', () => {
    const s = new schema.Schema();
    s.load('./tests/data/schema.yaml');
});