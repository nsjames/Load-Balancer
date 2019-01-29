const express = require('express');
const request = require('request');
const cors = require('cors');
const compression = require('compression');

const balancer = express();
balancer.use(compression());
balancer.use(cors());

let servers = [
	'eos.greymass.com',
	'proxy.eosnode.tools',
	'api.franceos.fr',
];

let serverDownCount = {};
let timeouts = {};

const serverDown = (server) => {
	if(!serverDownCount[server]) serverDownCount[server] = 0;
	serverDownCount[server]++;
	console.error(`Server down: ${server} | Count: ${serverDownCount[server]}`);
	servers = servers.filter(x => x !== server);
	setTimeout(() => {
		servers.push(server);
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
	const server = randomServer();
	if(!server) {
		res.status(500).send('All nodes are down!');
		return;
	}
	const _req = request({
		url: `https://${server}${req.url}`,
	})
	.on('response', (response) => {
		console.log(response.statusCode) // 200
		console.log(response.headers['content-type']) // 'image/png'
		res.server = server;
	})
	.on('error', error => {
		serverDown(server);
		res.status(500).send(error.message);
	});
	res.header('endpoint',server);
	res.header('access-control-allow-origin','*');
	res.header('access-control-allow-methods','GET, POST, OPTIONS');
	res.header('access-control-allow-headers','X-Requested-With,Accept,Content-Type,Origin');
	req.pipe(_req).pipe(res);
};

balancer.get('*', handler()).post('*', handler());
balancer.listen(7899);