const LSW = window.LSW || {};

Object.assign(LSW, require('../out/globals'));
LSW.App = require('../out/app');
LSW.Auth = require('../out/auth');
LSW.Client = require('../out/client');

window.LSW = LSW;
