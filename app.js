const express = require('express');
const { getMessage } = require('./lib/message');

const app = express();
const port = 8080;

app.get('/', (req, res) => {
    res.send(getMessage());
});

app.listen(port, () => {
    console.log(`App running on http://localhost:${port}`);
});
