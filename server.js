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
const os_1 = __importDefault(require("os"));
const ipaddr_js_1 = __importDefault(require("ipaddr.js"));
const app = (0, express_1.default)();
const PORT = 8080;
let registeredProxies = [];
app.set('trust proxy', true);
app.use(express_1.default.json());
function getClientIp(req) {
    const xForwardedForHeader = req.headers['x-forwarded-for'];
    let publicIp = '';
    let localIp = '';
    if (typeof xForwardedForHeader === 'string') {
        const ips = xForwardedForHeader.split(', ');
        publicIp = ips[0];
    }
    else if (Array.isArray(xForwardedForHeader)) {
        publicIp = xForwardedForHeader[0];
    }
    else {
        publicIp = req.socket.remoteAddress || '';
    }
    const networkInterfaces = os_1.default.networkInterfaces();
    for (const [, interfaces] of Object.entries(networkInterfaces)) {
        if (interfaces) {
            for (const iface of interfaces) {
                if (!iface.internal && iface.family === 'IPv4') {
                    localIp = iface.address;
                    break;
                }
            }
        }
        if (localIp)
            break;
    }
    return { publicIp, localIp };
}
app.post('/dtv/registerRTSPProxy', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const response = yield axios_1.default.get('https://api64.ipify.org/?format=json');
        const realip = response.data.ip;
        console.log("Real IP: ", realip);
        const { publicIp, localIp } = getClientIp(req);
        let ip = publicIp;
        if (ip && ipaddr_js_1.default.isValid(ip)) {
            ip = ipaddr_js_1.default.process(ip).toString();
        }
        console.log("Public IP: ", ip);
        console.log("Local IP: ", localIp);
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
