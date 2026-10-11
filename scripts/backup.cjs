'use strict';
const path = require('node:path');
const { openDatabase } = require('../storage');
const directory = process.env.DLS_DATA_DIR || path.join(__dirname, '..', 'data');
const storage = openDatabase(directory, () => { throw new Error('No existing database to back up'); });
try { console.log(storage.backup()); } finally { storage.close(); }
