// hosts: 52.59.244.124 hxehost #Bayer AWS Exp 2

// const port = process.env.PORT || 3000;
const express = require('express');
const app = express();

// For Swagger, before dotenv
process.env.AUTH_PREFIX = 'Api-Key ';
process.env.AUTH_API_KEY = 'VNTpi0KI4d5mnXL1SUQEya3zEh1JUUQc';

require('dotenv').config();
const xsenv = require('@sap/xsenv');
const https = require('https');
const bodyParser = require('body-parser');
https.globalAgent.options.ca = xsenv.loadCertificates(); // SSL
const router = require('./router');
const createError = require('http-errors');
const correlator = require('express-correlation-id'); // для идентификации в логах

// console.log(process.env.VCAP_SERVICES);
// console.log(xsenv.readServices());

// Logger
// const expressWinstonLoggerMiddleware = require('./logger/expressWinstonLogger.middleware');
// const expressWinstonErrorLoggerMiddleware = require('./logger/expressWinstonErrorLogger.middleware');
// const logger = require('./logger').logger;
const {
	expressWinstonLoggerMiddleware,
	expressWinstonErrorLoggerMiddleware,
	logger,
	passport,
	swagger,
	i18n,
} = require('./components');

// console.log(process.env.VCAP_SERVICES);
// var services = xsenv.readServices();
// console.log(services);

// console.log(xsenv.getServices({
// 	uaa: {
// 		tag: 'xsuaa',
// 	},
// }));

// const hanaOptions = xsenv.getServices({
// 	hana: {
// 		tag: 'hana',
// 	},
// });

// const hanaMiddleware = hdbext.middleware(hanaOptions.hana);

app.use(correlator());
app.use((req, res, next) => {
	const correlationId = req.correlationId();
	logger.defaultMeta.correlationId = correlationId;
	res.set(`x-correlation-id`, correlationId);
	next();
});
app.set('json spaces', 2);
app.use(expressWinstonLoggerMiddleware);
app.use(i18n()); // перевод сообщений об ошибках
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
	extended: false,
}));
app.use('/', router);
app.use(passport);
app.use((req, res, next) => {
	req.getUserId = () => req.user ? req.user.id : null;
	next();
});
app.use(swagger); // http://localhost:3000/api-docs/

// app.use('/', hanaMiddleware, childRouter);

// error handler
app.use(function(err, req, res, _next) {
	const {
		message,
		description = '',
		stack,
		status = 500,
		addInfo = null,
	} = err;
	// set locals, only providing error in development
	res.locals.message = message;
	res.locals.error = req.app.get('env') === 'development' ? err : {};

	// add this line to include winston logging
	console.error(`${status} - ${message} - ${description ? description + ' - ' : ''}${req.originalUrl} - ${req.method} - ${req.ip}`);
	console.error(`${stack}`);

	// render the error page
	res.status(status).json({
		message,
		description,
		stack,
		addInfo,
	});
});

app.get('/log', (req, res, next) => {
	const archiver = require('archiver');
	const archive = archiver.create('zip', {});
	// good practice to catch warnings (ie stat failures and other non-blocking errors)
	archive.on('warning', function(err) {
		if (err.code === 'ENOENT') {
			// log warning
			logger.warn(err);
		} else {
			// throw error
			next(err);
		}
	});
	archive.on('error', function(err) {
		next(err);
	});
	res.attachment('log.zip').type('zip');
	archive.pipe(res);

	archive.directory('log', false);
	archive.finalize();
});

// catch 404 and forward to error handler
app.use(function(req, res, next) {
	next(createError(404));
});

// express-winston errorLogger makes sense AFTER the router.
app.use(expressWinstonErrorLoggerMiddleware);

// error handler
app.use(function(err, req, res, _next) {
	let {
		message,
		description = '',
		stack,
		status = 500,
		addInfo = null,
		code,
	} = err;
	message = err && err.error && err.error.isJoi ? err.error : message;
	// set locals, only providing error in development
	res.locals.message = message;
	res.locals.error = req.app.get('env') === 'development' ? err : {};

	// add this line to include winston logging
	logger.error(`${status} - ${message} - ${description ? description + ' - ' : ''}${req.originalUrl} - ${req.method} - ${req.ip}`);
	if (stack) logger.error(`${stack}`);
	if (err && err.error && err.error.isJoi) {
		// we had a joi error, let's return a custom 400 json response
		res.status(400).json({
			type: err.type, // will be "query" here, but could be "headers", "body", or "params"
			message: err.error.toString(),
		});
	} else {
		switch (code) {
			case '-10709':
			case '10':
				message = 'Connection to the target database has been failed';
				break;
			default:
				break;
		}

		res.status(status).json({
			message,
			description,
			stack,
			addInfo,
		});
	}
});

// app.listen(port);

// console.log('Server listening on port %d', port);

module.exports = app;