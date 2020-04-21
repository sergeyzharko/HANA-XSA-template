/* eslint no-console: 0, no-unused-vars: 0, new-cap: 0 */
/* eslint-env node, es6 */
'use strict';
const WebSocketServer = require('ws').Server;
const express = require('express');

module.exports = function() {
	const app = express.Router();
	app.use((req, res) => {
		const output =
			`<H1>Node.js Web Socket Examples</H1></br>
			<a href="/chat">/exerciseChat</a> - Chat Application for Web Socket Example</br>`;
		res.type('text/html').status(200).send(output);
	});
	const wss = new WebSocketServer({
		port: 8081,
	});

	console.log('Started');

	wss.broadcast = data => {
		wss.clients.forEach(function each(client) {
			try {
				client.send(data);
			} catch (e) {
				console.log('Broadcast Error: %s', e.toString());
			}
		});
		console.log('sent: %s', data);
	};

	wss.on('connection', ws => {
		console.log('Connected');
		ws.on('message', message => {
			console.log('received: %s', message);
			wss.broadcast(message);
		});
		ws.send(JSON.stringify({
			user: 'XS',
			text: 'Hello from Node.js XS Server',
		}));
	});

	return app;
};