#!/usr/bin/env node

const path = require("path");
const pjson = require(path.resolve(__dirname + "/../package.json"));

console.log("Version of Mongo Portable: " + pjson.version);