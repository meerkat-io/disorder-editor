const yaml = require('js-yaml');
const fs = require('fs');

try {
  const fileContents = fs.readFileSync('src/test/schema-example/schema.yaml', 'utf8');
  const data = yaml.load(fileContents);
  console.log(data);
} catch (e) {
  console.error(e);
}