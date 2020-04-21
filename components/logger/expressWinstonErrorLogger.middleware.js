const expressWinston = require('express-winston');
const logger = require('./log');

module.exports = expressWinston.errorLogger({
	winstonInstance: logger,
});