const passport = require('./passport');
const swagger = require('./swagger');
const i18n = require('./i18n');
const { expressWinstonLoggerMiddleware, expressWinstonErrorLoggerMiddleware, logger } = require('./logger');

module.exports = {
	logger,
	passport,
	swagger,
	i18n,
	expressWinstonLoggerMiddleware,
	expressWinstonErrorLoggerMiddleware,
};