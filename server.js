"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const axios_1 = __importDefault(require("axios"));
const app = (0, express_1.default)();
const PORT = 8080;
const requestIp = require('request-ip');
const ipaddr = require('ipaddr.js');
let registeredProxies = [];
app.set('trust proxy', true);
app.use(express_1.default.json());
function getClientIp(req) {
    const xForwardedForHeader = req.headers['x-forwarded-for'];
    if (typeof xForwardedForHeader === 'string') {
        const ips = xForwardedForHeader.split(', ');
        return ips[0];
    }
    else if (Array.isArray(xForwardedForHeader)) {
        return xForwardedForHeader[0];
    }
    else {
        return req.socket.remoteAddress || '';
    }
}
//TESTAR FUNCAO EM CASA
app.post('/dtv/registerRTSPProxy', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const response = yield axios_1.default.get('https://api64.ipify.org/?format=json');
        const realip = response.data.ip;
        console.log("realip: ", realip);
        let ip = getClientIp(req);
        if (ip && ipaddr.isValid(ip)) {
            ip = ipaddr.process(ip).toString();
        }
        console.log("ip: ", ip);
        registeredProxies.push({ realip, ip });
        res.status(200).send('RTSP Registered successfully.');
    }
    catch (error) {
        console.error('Error fetching public IP:', error);
        res.status(500).send('Internal Server Error');
    }
}));
app.get('/dtv/obtainRTSPProxy', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const response = yield axios_1.default.get('https://api64.ipify.org/?format=json');
        const publicIp = response.data.ip;
        const proxy = registeredProxies.find((p) => p.realip === publicIp);
        if (proxy) {
            res.status(200).json({ ip: proxy.ip });
        }
        else {
            res.status(404).send('Not found.');
        }
    }
    catch (error) {
        console.error('Error fetching public IP:', error);
        res.status(500).send('Internal Server Error');
    }
}));
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
