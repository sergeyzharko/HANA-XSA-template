const fs = require('fs');
const path = require('path');
const express = require('express');
const router = express.Router();
const Dao = require('./dao');
const { promisify } = require('util');
const hdbext = require('@sap/hdbext');
const xsenv = require('@sap/xsenv');
const controller = require('./controller');
// const hanaDb = require('./components/hana/hana.db');

const hanaMiddleware = require('./components/hana/hana.middleware'); // Для подключения при помощи .env файла

const secure = require('./components/passport/secure');

const Joi = require('@hapi/joi');
const validator = require('./validator');
const { logger } = require('./components/logger');
const {	RequestError } = require('./utils');

const statement = fs.readFileSync(path.resolve(__dirname, 'statement.sql'), 'utf8');

const createConnection = promisify(hdbext.createConnection);

const NodeCache = require('node-cache');
const myCache = new NodeCache({ stdTTL: 300, checkperiod: 120 });
// number in seconds for every generated cache element, period in seconds, as a number, used for the automatic delete check interval

/**
 * @swagger
 * /:
 *    get:
 *      description: App main route
 *      responses:
 *        200:
 *          description: OK
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                  name:
 *                    type: string
 *                    example: dmt-api
 *                  version:
 *                    type: string
 *                    example: 1.0.0
 */
router.get('/', (req, res, next) => {
	try {
		res.json(controller.getVersion());
	} catch (err) {
		next(err);
	}
});

router.get('/test', function(req, res) {
	res.type('application/json').status(200).send('test');
});

router.get('/pt_query', secure, async function(req, res) {

	// Instead of hanaMiddleware

	const hanaOptionsEnv = xsenv.getServices({
		hana: {
			tag: 'hana',
		},
	});

	const client = await createConnection({ ...hanaOptionsEnv.hana });
	const secondDAO = new Dao(client);

	const cached = myCache.get('pt_query');
	if (cached) {
		logger.debug(`pt_query returned from cache`);
		res.type('application/json').status(200).send(cached);
	}

	const statement = await secondDAO.preparePromisified(`select top 10 * from "dqt.db::repo.pt_query"`);
	const data = await secondDAO.statementExecPromisified(statement);
	myCache.set( 'pt_query', data );
	res.type('application/json').status(200).send(data);
});

router.get('/cache/stats', secure, async function(req, res) { // Статистика кэша
	const data = myCache.getStats();
	res.type('application/json').status(200).send(data);
});

router.get('/cache/flush', secure, async function(req, res) { // Очистить кэш
	myCache.flushAll();
	res.type('application/json').status(200).send('Done');
});

router.get('/user', secure, hanaMiddleware, async function(req, res) {
	const data = req.authInfo;
	console.log(req.user); // secure
	console.log(req.authInfo.getHdbToken()); // secure
	res.type('application/json').status(200).send(data);
});

router.get('/sql_user', secure, hanaMiddleware, async function(req, res) {
	const hanaOptionsEnv = xsenv.getServices({
		hana: {
			tag: 'hana',
		},
	});

	const client = await createConnection({ ...hanaOptionsEnv.hana });
	const secondDAO = new Dao(client);
	const statement = await secondDAO.preparePromisified(`SELECT * FROM M_SESSION_CONTEXT`);
	const data = await secondDAO.statementExecPromisified(statement);
	res.type('application/json').status(200).send(data);
});

router.get('/getSessionData', secure, hanaMiddleware, async function(req, res, next) {
	const connParams = {
		serverNode: '18.196.189.210:39015',
		uid: 'DMT',
		pwd: 'DmtPass123',
		CURRENTSCHEMA: 'SXGMDA',
	};

	const hanaOptions = {
		...connParams,
		'sessionVariable:XS_APPLICATIONUSER': req.authInfo.getHdbToken()
		,
	};

	const hanaOptionsEnv = xsenv.getServices({
		hana: {
			tag: 'hana',
		},
	});

	let client;
	let secondDAO;
	let rawData;

	try {
		client = await createConnection({ ...hanaOptionsEnv.hana, ...hanaOptions });
		secondDAO = new Dao(client);
		rawData = await secondDAO.getSessionData();
		res.type('application/json').status(200).send(rawData);
	} catch (err) {
		next(err);
		throw new Error(`Error: ',`, err);
	}
});

// обращение к указанной базе
router.get('/query', secure, hanaMiddleware, async function(req, res, next) {
	const connParams = {
		serverNode: '18.196.189.210:39015',
		uid: 'DMT',
		pwd: 'DmtPass123',
		CURRENTSCHEMA: 'SXGMDA',
	};

	const hanaOptions = {
		...connParams,
		'sessionVariable:XS_APPLICATIONUSER': req.authInfo.getHdbToken()
		,
	};

	const hanaOptionsEnv = xsenv.getServices({
		hana: {
			tag: 'hana',
		},
	});

	let client;
	let secondDAO;
	let rawData;

	try {
		client = await createConnection({ ...hanaOptionsEnv.hana, ...hanaOptions });
		secondDAO = new Dao(client);
		rawData = await secondDAO.execGeneratedQuery(statement);
		// console.log(await secondDAO.getSessionData());
		res.type('application/json').status(200).send(rawData);
	} catch (err) {
		next(err);
		throw new Error(`Error: ',`, err);
	}
});

// обращение к базе из env
router.get('/query2', secure, hanaMiddleware, async function(req, res, next) {
	try {
		const {
			db,
			i18n,
			locale,
			authInfo,
		} = req;

		const context = {
			oHdbConnection: db, // hanaMiddleware
			i18n, // app.use(i18n());
			locale, // app.use(i18n());
			sUser: req.user.id, // secure
			hdbToken: authInfo.getHdbToken(), // secure
		};
		res.json(await controller.query(context));
	} catch (err) {
		next(err);
	}
});

router.post('/auth/sign-in', async(req, res, next) => {
	try {
		const {
			username,
			password,
		} = req.body;
		const result = await controller.signIn(username, password);
		res.set('Authorization', `Bearer ${result['access_token']}`);
		res.set('RefreshToken', result['refresh_token']);
		res.json(result);
	} catch (err) {
		next(err);
	}
});

// Winston

router.use('/info', function(req, res) {
	res.status(200).json({ message: 'text' });
});

router.use('/warn', function(req, res) {
	res.status(400).json({ message: 'text' });
});

// http://localhost:3000/error
router.use('/error', function(req, res) {
	res.status(500).json({ message: 'text' });
});

router.get('/error2', function(req, res, next) {
	// here we cause an error in the pipeline so we see express-winston in action.
	const err = 'This is an error and it should be logged to the console';
	logger.error(err);
	return next(new Error(err));
});

router.use('/error3', function(req) {
	const {
		i18n,
		locale,
	} = req;
	console.log('locale', locale);
	// throw new RequestError(i18n.translate('common.message.error', locale), 400); // error without parameters
	throw new RequestError(i18n.translate('common.message.errorParams', locale, ['first', 'second']), 400); // только ошибки роутера, http
});

// sync
router.put(
	'/etl/run/:scriptRunId/:stepDesc',
	validator.params(Joi.object().keys({
		scriptRunId: Joi.number().integer().required(),
		stepDesc: Joi.string().required(),
	})),
	async(req, res, next) => { // Option 1
		const connParams = {
			serverNode: '18.196.189.210:39015',
			uid: 'SZharko',
			pwd: 'Amaranth123',
			CURRENTSCHEMA: 'SXGMDA',
		};
		const client = await createConnection(connParams);

		try {
			const {
				// db, // Option 2
				params: {
					scriptRunId,
					stepDesc,
				},
			} = req;
			// res.json(await controller.add(db, scriptRunId, stepDesc)); // current db
			res.json(await controller.add(client, scriptRunId, stepDesc)); // remote db
		} catch (err) {
			next(err);
		}
	});

// async
router.get(
	'/etl/release_cube',
	validator.query(Joi.object().keys({
		assetId: Joi.number().integer().required(),
		stepRunId: Joi.number().integer().required(),
		assetName: Joi.string().alphanum().required(),
	})),
	async(req, res) => {
		const connParams = {
			serverNode: '18.196.189.210:39015',
			uid: 'SZharko',
			pwd: 'Amaranth123',
			CURRENTSCHEMA: 'SXGMDA',
		};
		// Option 1
		const client1 = await createConnection(connParams);

		res.json({ message: 'SP has been runned' });

		try {
			const {
				query: {
					assetId,
					stepRunId,
					assetName,
				},
			} = req;
			// const client = await hanaDb(); // Option 2
			// await controller.releaseCube(client, assetId, stepRunId, assetName); // Option 2
			await controller.releaseCube(client1, assetId, stepRunId, assetName); // Option 1
		} catch (err) {
			console.log(err);
			logger.error(err);
		}
	},
);

// sp, connection data from .env
router.get(
	'/sp', secure, hanaMiddleware,
	validator.query(Joi.object().keys({
		flowid: Joi.number().integer().required(),
		ruleid: Joi.number().integer().required(),
	})),
	async(req, res, next) => {
		try {
			const {
				db,
				query: {
					flowid,
					ruleid,
				},
			} = req;
			res.json(await controller.sp(db, flowid, ruleid));
		} catch (err) {
			next(err);
		}
	});

router.use('/chatServer', require('./components/chatServer')());

router.use(express.static(__dirname + '/ui')); // http://localhost:8000/index.html
// http://localhost:8000/chat/index.html

// router.get('/', function(req, res) {
// 	// res.type('application/json').status(200).send('test');
// 	res.sendFile(__dirname + '/');
// });

module.exports = router;