const {
	createLogger,
	format,
	transports,
} = require('winston');
require('winston-daily-rotate-file');
const fs = require('fs');
const path = require('path');
const { errors } = require('@elastic/elasticsearch');
const Elasticsearch = require('winston-elasticsearch');
const { name } = require('../../package.json');

const maxFiles = process.env.LOG_MAX_FILES_KEEP || '30d';
const maxSize = process.env.LOG_MAX_SIZE_ROTATE || '100m';

const myFormat = format.printf((
	{
		level,
		message,
		timestamp,
		correlationId = '',
	}) => {
	return `${new Date(timestamp).toLocaleTimeString()} ${level}: ${message} ${correlationId}`;
});

const logDir = 'log';

// Create the log directory if it does not exist
if (!fs.existsSync(logDir)) {
	fs.mkdirSync(logDir);
}
const setPath = filename => path.join(logDir, filename);

const logger = createLogger({
	level: 'info',
	defaultMeta: {
		service: name,
		env: process.env.NODE_ENV,
	},
	format: format.combine(
		format.timestamp(),
		format.simple(),
		format.colorize(),
		format.json(),
	),
	transports: [
		new transports.DailyRotateFile({
			filename: setPath('error-%DATE%.log'),
			level: 'error',
			datePattern: 'YYYY-MM-DD',
			zippedArchive: true,
			maxSize,
			maxFiles,
		}),
		new transports.DailyRotateFile({
			filename: setPath('combined-%DATE%.log'),
			datePattern: 'YYYY-MM-DD',
			zippedArchive: true,
			maxSize,
			maxFiles,
			format: format.combine(
				format.timestamp(),
				myFormat,
			),
		}),
		new transports.Console({
			level: 'error',
		}),
		new transports.Console({
			level: 'info',
			format: format.combine(
				format.timestamp(),
				format.colorize(),
				format.simple(), // `${info.level}: ${info.message} JSON.stringify({ ...rest })
				myFormat,
			),
			json: true,
			colorize: true,
		}),
	],
	exceptionHandlers: [
		new transports.DailyRotateFile({
			filename: setPath('exceptions-%DATE%.log'),
			datePattern: 'YYYY-MM-DD',
			zippedArchive: true,
			maxSize,
			maxFiles,
		}),
		new transports.Console(),
	],
});

// If we're not in production then log to the `console` with the format:
// `${info.level}: ${info.message} JSON.stringify({ ...rest }) `
// if (process.env.NODE_ENV !== 'production') {
// 	logger.add(new transports.Console({
// 		format: format.combine(
// 			format.timestamp(),
// 			format.colorize(),
// 			format.simple(), // `${info.level}: ${info.message} JSON.stringify({ ...rest })
// 			myFormat, // log only required
// 		),
// 		json: true,
// 		colorize: true,
// 	}));
// }

if (process.env.ELASTIC_SEARCH_LOGGING_URL) {
	try {
		const { Client } = require('@elastic/elasticsearch');
		const client = new Client({
			node: process.env.ELASTIC_SEARCH_LOGGING_URL,
			maxRetries: 5,
			requestTimeout: 60000,
		});
		const esTransportOpts = {
			level: 'info',
			client,
			format: format.combine(
				format.timestamp(),
				format.json(),
			),
		};
		logger.add(new Elasticsearch(esTransportOpts)); // everything info and above goes to elastic
	} catch (err) {
		logger.error('Elasticsearch failed');
		logger.error(err);
		logger.error(errors);
	}
}

logger.on('error', err => {
	console.error('logger crashed with error!', err);
	logger.error('logger crashed with error!');
	logger.error(err);
});

module.exports = logger;