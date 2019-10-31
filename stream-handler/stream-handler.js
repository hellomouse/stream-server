const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const fsP = fs.promises;
const path = require('path');

const blacklist = [
  'view', 'time', 'status', 'control', 'app', 'api'
];
const STREAM_DIRECTORY = '/var/www/live/streams/';

let app = express();
let streams = new Set();
app.use(bodyParser.urlencoded({ extended: true }));
app.post('/publish', (req, res) => {
  console.log(req.body);
  let name = req.body.name;
  // stream key must be provided
  if (!name) {
    console.log('empty name provided, disallow');
    return res.status(400).send();
  }
  // do not allow subdirectories
  if (name.includes('/')) {
    console.log('slash in name, disallow');
    return res.status(400).send();
  }
  // do not allow blacklisted stream names
  if (blacklist.includes(name)) {
    console.log(`blacklisted name ${name}, disallow`);
    return res.status(400).send();
  }
  console.log('stream started: ' + name);
  streams.add(name);
  res.redirect(name);
});
app.post('/publish-end', (req, res) => {
  console.log('stream ended: ' + req.body.name);
  streams.delete(req.body.name);
});
app.get('/api', (req, res) => {
  res.json({ hello: 'world' });
});
app.get('/api/streams', async (req, res) => {
  res.json([...streams]);
});

(async function main() {
  let entries = await fsP.readdir(STREAM_DIRECTORY);
  let statResult = await Promise.allSettled(entries.map(file => {
    return fsP.stat(path.join(STREAM_DIRECTORY, file, 'index.mpd'));
  }));
  for (let i = 0; i < entries.length; i++) {
    if (statResult[i].status === 'fulfilled') streams.add(entries[i]);
  }
  console.log('found existing streams', streams);
  app.listen(8065, () => console.log('listening'));
})();
