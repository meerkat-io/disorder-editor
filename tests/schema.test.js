const { Schema } = require('../disorder/schema');

test('load schema from yaml file', () => {
    const s = new Schema();
    s.load('./tests/data/schema.yaml');
    console.log(s);
});

test('load enum schema', () => {
    const s = new Schema();
    s.load('./tests/data/enum.yaml');
    console.log(s);
});