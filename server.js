const express = require('express');
const request = require('request');
const cors = require('cors');
const compression = require('compression');
require('dotenv').config()

const balancer = express();
balancer.use(compression());
balancer.use(cors());

let servers = process.env.SERVERS.split(',');
let down = [];

let serverDownCount = {};
let lastDown = {};
let timeouts = {};

const serverDown = (server) => {
	if(!serverDownCount[server]) serverDownCount[server] = 0;
	serverDownCount[server]++;
	lastDown[server] = +new Date();

	console.error(`Server down: ${server} | Count: ${serverDownCount[server]}`);
	servers = servers.filter(x => x !== server);
	down.push(server);
	setTimeout(() => {
		servers.push(server);
		down = down.filter(x => x !== server);
	}, serverDownCount[server]*1000);
}


const randomServer = () => {
	if(!servers.length){
		console.error(`CRITICAL! No available servers!`);
		return null;
	}
	return servers[Math.floor(Math.random()*servers.length)]
}

const handler = () => (req, res) => {
	// res.status(500).send('All nodes are down!');
	// return;
	const server = randomServer();
	if(!server) {
		res.status(500).send('All nodes are down!');
		return;
	}
	const _req = request({
		url: `https://${server}${req.url}`,
	})
	.on('error', error => {
		serverDown(server);

		// Recurse until server found
		return handler(req, res);
	});
	// res.header('endpoint',server);
	// res.header('access-control-allow-origin','*');
	// res.header('access-control-allow-methods','GET, POST, OPTIONS');
	// res.header('access-control-allow-headers','X-Requested-With,Accept,Content-Type,Origin');
	console.log('_req', _req);
	req.pipe(_req).pipe(res);
};

balancer.get('/stats', (req,res) => {

	res.json({
		up:servers,
		down,
		lastDown,
		serverDownCount
	});
});
balancer.get('*', handler()).post('*', handler());
balancer.listen(process.env.PORT);