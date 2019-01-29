const fetch = require('isomorphic-fetch');
require('dotenv').config()
const { exec } = require('child_process');
const fs = require('fs');

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


let lastFile;

const checkServers = async () => {
	console.log(`Checking Servers: ${+new Date()} - ${(new Date()).toLocaleString()}`);
	const upservers = (await Promise.all(servers.map(server => {
		return fetch(`https://${server}/v1/chain/get_info`).then(x => x.json()).then(x => {
			if(!x.chain_id) {
				serverDown(server);
				return null;
			}

			return server;
		}).catch(err => {
			serverDown(server);
			return null;
		})
	}))).filter(x => !!x).map(x => `server ${x}:443;\r\n`);


	const newFile = block(upservers.join(' '));
	console.log('newFile', newFile);
	// if(lastFile !== newFile){
	// 	lastFile = newFile;
	//
	// 	fs.writeFile('/etc/nginx/sites-available/default', block(upservers.join(' ')), function (err) {
	// 		if (err) console.error(err);
	// 		exec(`sudo service nginx reload`, function(error, stdout, stderr) {
	// 			if(error) console.error('error', error);
	// 			// command output is in stdout
	// 		});
	// 	});
	// }

	// setTimeout(() => {
	// 	checkServers();
	// }, 10000);
}

checkServers();




//
//
// const randomServer = () => {
// 	if(!servers.length){
// 		console.error(`CRITICAL! No available servers!`);
// 		return null;
// 	}
// 	return servers[Math.floor(Math.random()*servers.length)]
// }
//
// const handler = () => (req, res) => {
// 	const server = randomServer();
// 	if(!server) {
// 		res.status(500).send('All nodes are down!');
// 		return;
// 	}
//
// 	res.header('endpoint',server);
// 	res.header('access-control-allow-origin','*');
// 	res.header('access-control-allow-methods','GET, POST, OPTIONS');
// 	res.header('access-control-allow-headers','X-Requested-With,Accept,Content-Type,Origin');
//
//
//
// 	rp({
// 		uri: `https://${server}${req.url}`,
// 		gzip: true
// 	}).then(x => {
// 		// req.pipe(x).pipe(res);
// 		res.json(JSON.parse(x));
// 	}).catch(err => {
// 		return res.send(err);
// 		serverDown(server);
//
// 		// Recurse until server found
// 		return handler(req, res);
// 	})
// };
//
// balancer.get('/stats', (req,res) => {
//
// 	res.json({
// 		up:servers,
// 		down,
// 		lastDown,
// 		serverDownCount
// 	});
// });
// balancer.get('*', handler()).post('*', handler());
// balancer.listen(process.env.PORT);




const block = s => `
upstream nodes {
    ip_hash;
}

upstream ssl_nodes {
    ip_hash;
    ${s}
}

server {
  listen 80;

  location / {
    proxy_pass http://nodes;

    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;


    resolver                  8.8.8.8 valid=300s;
    resolver_timeout          10s;

  }
}

server {
  listen 443 ssl;
  server_name nodes.get-scatter.com;

  proxy_ssl_session_reuse on;
  ssl_certificate /etc/letsencrypt/live/nodes.get-scatter.com/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/nodes.get-scatter.com/privkey.pem;
  ssl_verify_client off;

  location / {
    proxy_pass https://ssl_nodes;

    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;


    resolver                  8.8.8.8 valid=300s;
    resolver_timeout          10s;

  }
}`




/*


upstream nodes {
    ip_hash;
        server api-mainnet.eosgravity.com;
        server bp.cryptolions.io;
        server node2.liquideos.com;
}

upstream ssl_nodes {
    ip_hash;

#       server api-mainnet.eosgravity.com:443;
#       server bp.cryptolions.io:443;
#       server node2.liquideos.com:443;
#       server api.eosnewyork.io:443;
#       server eu.eosdac.io:443;
        server eos.greymass.com:443;
#       server proxy.eosnode.tools:443;
#       server api.franceos.fr:443;

}

server {
  listen 80;

  location / {
    proxy_pass http://nodes;

    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;


    resolver                  8.8.8.8 valid=300s;
    resolver_timeout          10s;

  }
}

server {
  listen 443 ssl;
  server_name nodes.get-scatter.com;

  proxy_ssl_session_reuse on;
  ssl_certificate /etc/letsencrypt/live/nodes.get-scatter.com/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/nodes.get-scatter.com/privkey.pem;
  ssl_verify_client off;

  location / {
    proxy_pass https://ssl_nodes;

    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;


    resolver                  8.8.8.8 valid=300s;
    resolver_timeout          10s;

  }
}


 */