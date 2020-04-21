const xssec = require('@sap/xssec');
const xsenv = require('@sap/xsenv');
const passport = require('passport');
const router = require('express').Router();

passport.use('JWT', new xssec.JWTStrategy(xsenv.getServices({
	uaa: {
		tag: 'xsuaa',
	},
}).uaa));

router.use(passport.initialize());

module.exports = router;