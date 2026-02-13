import http from 'http';

const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/master-tax-objects/search?q=gudang',
    method: 'GET',
};

const req = http.request(options, (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    res.setEncoding('utf8');
    res.on('data', (chunk) => {
        // console.log(`BODY: ${chunk}`);
        console.log("Response received.");
    });
});

req.on('error', (e) => {
    console.error(`problem with request: ${e.message}`);
});

req.end();
