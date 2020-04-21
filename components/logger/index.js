const expressWinstonLoggerMiddleware = require('./expressWinstonLogger.middleware');
const expressWinstonErrorLoggerMiddleware = require('./expressWinstonErrorLogger.middleware');
const logger = require('./log');

module.exports = {
	logger,
	expressWinstonLoggerMiddleware,
	expressWinstonErrorLoggerMiddleware,
};