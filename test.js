const assert = require('assert');
const { getMessage } = require('./lib/message');

assert.strictEqual(
    getMessage(),
    'Hello World!'
);

console.log('Unit test passed successfully.');
