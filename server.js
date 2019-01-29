const express = require('express');
const request = require('request');
const rp = require('request-promise-native');
const cors = require('cors');
const compression = require('compression');
require('dotenv').config()

const balancer = express();
balancer.use(compression());
balancer.use(cors());

let servers = process.env.SERVERS.split(',');//['node.com']//
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
	down = down.filter(x => x !== server);
	down.push(server);
	setTimeout(() => {
		servers = servers.filter(x => x !== server);
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
	const server = randomServer();
	if(!server) {
		res.status(500).send('All nodes are down!');
		return;
	}

	res.header('endpoint',server);
	res.header('access-control-allow-origin','*');
	res.header('access-control-allow-methods','GET, POST, OPTIONS');
	res.header('access-control-allow-headers','X-Requested-With,Accept,Content-Type,Origin');

	Promise.race([
		new Promise(r => {
			setTimeout(() => {
				r(false);
				return res.send('timeout');
			}, 1000);
		}),
		rp({
			uri: `https://${server}${req.url}`,
			gzip: true
		}).then(x => {
			// req.pipe(x).pipe(res);
			res.json(JSON.parse(x));
		}).catch(err => {
			return res.send(err);
			serverDown(server);

			// Recurse until server found
			return handler(req, res);
		})
	])
	// .on('error', error => {
	// 	console.error(error);
	// 	serverDown(server);
	//
	// 	// Recurse until server found
	// 	return handler(req, res);
	// });
	//

	// req.pipe(_r).pipe(res);
	// return true;
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