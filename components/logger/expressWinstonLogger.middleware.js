const expressWinston = require('express-winston');
const logger = require('./log');

// Log the whole request and response body
expressWinston.requestWhitelist.push('body');
expressWinston.responseWhitelist.push('body');

module.exports = expressWinston.logger({
	winstonInstance: logger,
	// transports: [
	//     new winston.transports.Console({
	//   json: true,
	//   colorize: true
	// })
	// ],
	statusLevels: false, // default value
	level: (req, res) => {
		let level = '';
		if (res.statusCode >= 100) level = 'info';
		if (res.statusCode >= 400) level = 'warn';
		if (res.statusCode >= 500) level = 'error';
		// Ops is worried about hacking attempts so make Unauthorized and Forbidden critical
		if (res.statusCode === 401 || res.statusCode === 403) level = 'error';
		return level;
	},
	dynamicMeta: (req, res) => ({
		user: req.user ? req.user.id : null,
		correlationId: res.get(`x-correlation-id`),
	}),
});