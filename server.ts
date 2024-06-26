import express, { Request, Response } from 'express';
import axios from 'axios';
import os from 'os';
import ipaddr from 'ipaddr.js';

const app = express();
const PORT = 8080;

interface RTSPProxy {
  localIp: string;
  ip: string;
}

let registeredProxies: RTSPProxy[] = [];

app.set('trust proxy', true);

app.use(express.json());

function getClientIp(req: Request): { publicIp: string, localIp: string } {
  const xForwardedForHeader = req.headers['x-forwarded-for'];
  let publicIp = '';
  let localIp = '';
  if (typeof xForwardedForHeader === 'string') {
    const ips = xForwardedForHeader.split(', ');
    publicIp = ips[0];
  } else if (Array.isArray(xForwardedForHeader)) {
    publicIp = xForwardedForHeader[0];
  } else {
    publicIp = req.socket.remoteAddress || '';
  }

  const networkInterfaces = os.networkInterfaces();
  for (const [, interfaces] of Object.entries(networkInterfaces)) {
    if (interfaces) {
      for (const iface of interfaces) {
        if (!iface.internal && iface.family === 'IPv4') {
          localIp = iface.address;
          break;
        }
      }
    }
    if (localIp) break;
  }  

  return { publicIp, localIp };
}

app.post('/dtv/registerRTSPProxy', async (req, res) => {
  try {
    const { publicIp, localIp } = getClientIp(req);

    let ip = publicIp;
    if (ip && ipaddr.isValid(ip)) {
      ip = ipaddr.process(ip).toString();
    }
    console.log("Public IP: ", ip);
    console.log("Local IP: ", localIp);

    registeredProxies.push({ localIp, ip });

    res.status(200).send('RTSP Registered successfully.');
  } catch (error) {
    console.error('Error fetching public IP:', error);
    res.status(500).send('Internal Server Error');
  }
});

function getClientIpReq(req: Request): string {
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

app.get('/dtv/obtainRTSPProxy', async (req: Request, res: Response) => {
  try {
    const response = getClientIpReq(req);  
    const ip = response;

    let publicIp = ip;
    if (publicIp && ipaddr.isValid(publicIp)) {
      publicIp = ipaddr.process(publicIp).toString();
    }

    console.log("Public IP: ", publicIp);

    const proxy = registeredProxies.find((p) => p.ip === publicIp);
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
