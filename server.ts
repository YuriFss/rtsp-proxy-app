import express, { Request, Response } from 'express';
import axios from 'axios';

const app = express();
const PORT = 8080;
const requestIp = require('request-ip');
const ipaddr = require('ipaddr.js');

interface RTSPProxy {
  realip: string;
  ip: string;
}

let registeredProxies: RTSPProxy[] = [];

app.set('trust proxy', true);

app.use(express.json());

function getClientIp(req: Request): string {
  const xForwardedForHeader = req.headers['x-forwarded-for'];
  if (typeof xForwardedForHeader === 'string') {
    const ips = xForwardedForHeader.split(', ');
    return ips[0];
  } else if (Array.isArray(xForwardedForHeader)) {
    return xForwardedForHeader[0];
  } else {
    return req.socket.remoteAddress || '';
  }
}

//TESTAR FUNCAO EM CASA

app.post('/dtv/registerRTSPProxy', async (req, res) => {
  try {
    const response = await axios.get('https://api64.ipify.org/?format=json');

    const realip = response.data.ip;
    console.log("realip: ", realip);

    let ip = getClientIp(req);
    if (ip && ipaddr.isValid(ip)) {
      ip = ipaddr.process(ip).toString();
    }
    console.log("ip: ", ip);

    registeredProxies.push({ realip, ip });

    res.status(200).send('RTSP Registered successfully.');
  } catch (error) {
    console.error('Error fetching public IP:', error);
    res.status(500).send('Internal Server Error');
  }
});

app.get('/dtv/obtainRTSPProxy', async (req: Request, res: Response) => {
  try {
    const response = await axios.get('https://api64.ipify.org/?format=json');
    const publicIp = response.data.ip;

    const proxy = registeredProxies.find((p) => p.realip === publicIp);
    if (proxy) {
      res.status(200).json({ ip: proxy.ip });
    } else {
      res.status(404).send('Not found.');
    }
  } catch (error) {
    console.error('Error fetching public IP:', error);
    res.status(500).send('Internal Server Error');
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
