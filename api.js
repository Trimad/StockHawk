const fs = require('fs');
const express = require('express');
const bodyParser = require('body-parser');
const unirest = require("unirest");
const regression = require('regression');

app = express();
app.use(express.static('public')); //enable all CORS requests
app.use(bodyParser.urlencoded({ extended: true })); //enable POST requests

let COMMAND = process.argv;
const server = app.listen(3000, () => {
    function init() {
        for (c of COMMAND) {
            console.log(c);
            if (c == "live") {
                DEBUG = false;
                console.log('\x1b[31m%s\x1b[0m', 'YOU ARE TRADING WITH REAL CURRENCY');  //cyan
            } else if (c == "test" || c == "debug") {
                DEBUG = true;
                console.log('\x1b[33m%s\x1b[0m', 'YOU ARE TRADING WITH PAPER CURRENCY');  //cyan 
            }
        }
        CLIENT_ID = DEBUG ? CONFIG.alpaca.paper.apiKey : CONFIG.alpaca.live.apiKey;
        CLIENT_SECRET = DEBUG ? CONFIG.alpaca.paper.secretKey : CONFIG.alpaca.live.secretKey;
        BASE_URL = DEBUG ? CONFIG.alpaca.paper.baseUrl : CONFIG.alpaca.live.baseUrl;
    }
    init();
});

const storeData = (data, path) => {
    try {
        fs.writeFileSync(path, JSON.stringify(data))
    } catch (err) {
        console.error(err)
    }
}

const loadData = (path) => {
    try {
        return fs.readFileSync(path, 'utf8')
    } catch (err) {
        console.error(err)
        return false;
    }
}

const CONFIG = JSON.parse(loadData("config.json"));


let DEBUG;
let CLIENT_ID;
let CLIENT_SECRET;
let BASE_URL;

const map = function (n, start1, stop1, start2, stop2) {
    return ((n - start1) / (stop1 - start1)) * (stop2 - start2) + start2;
};

/*****************************************************************
 * API: Alpaca
 * Description: 
 * Usage: 
 *****************************************************************/
app.get('/account', (request, response) => {
    console.log('\x1b[36m%s\x1b[0m', request.url, new Date().toLocaleString());

    let url = BASE_URL + "/v2/account";
    let req = unirest("GET", url);

    req.headers({
        "APCA-API-KEY-ID": CLIENT_ID,
        "APCA-API-SECRET-KEY": CLIENT_SECRET
    }).then((res) => {
        delete res.body['id'];
        delete res.body['account_number'];
        delete res.body['created_at'];
        response.send(res.body);
    });
});

/*****************************************************************
 * API: Alpaca
 * Description: 
 *****************************************************************/
app.get('/account/activity', (request, response) => {
    console.log('\x1b[36m%s\x1b[0m', request.url, new Date().toLocaleString());
    var date = new Date(); // Or the date you'd like converted.
    let today = new Date(date.getTime() - (date.getTimezoneOffset() * 60000)).toISOString().slice(0, 10);
    let url = BASE_URL + "/v2/account/activities?date=" + today;
    let req = unirest("GET", url);

    req.headers({
        "APCA-API-KEY-ID": CLIENT_ID,
        "APCA-API-SECRET-KEY": CLIENT_SECRET
    }).then((res) => {
        response.send(res.body);
    });

});

/*****************************************************************
 * API: Alpaca
 * Created: 28FEB2021
 * Description: 1. Returns an array of every asset that can be traded on Alapca.
 *              2. Saves an array of all tradable stock symbols as /data/symbols.json.
 * Documentation: https://alpaca.markets/docs/api-documentation/api-v2/assets/
 * Usage: localhost:3000/assets
 *****************************************************************/
app.get('/assets', (request, response) => {
    console.log(request.url, new Date().toLocaleString());

    let url = BASE_URL + "/v2/assets";
    let req = unirest("GET", url);

    req.headers({
        "APCA-API-KEY-ID": CLIENT_ID,
        "APCA-API-SECRET-KEY": CLIENT_SECRET
    }).then((res) => {
        let assets = res.body.filter(asset => asset.tradable);
        let symbols = [];
        assets.forEach(asset => { symbols.push(asset.symbol); });
        storeData(symbols, "data/symbols.json");
        response.send(assets);
    });

});


app.get('/bracket/:symbol/:quantity/:stopLoss/:takeProfit', (request, response) => {
    console.log('\x1b[32m%s\x1b[0m', request.url, new Date().toLocaleString());
    const symbol = request.params.symbol;
    const quantity = request.params.quantity;
    const stopLoss = request.params.stopLoss;
    const takeProfit = request.params.takeProfit;

    let url = BASE_URL + "/v2/orders";
    let req = unirest("POST", url);

    let order = JSON.stringify({
        "side": "buy",
        "symbol": symbol,
        "type": "market",
        "qty": quantity,
        "time_in_force": "day",
        "order_class": "bracket",
        "take_profit": {
            "limit_price": takeProfit
        },
        "stop_loss": {
            "stop_price": stopLoss
        }
    });

    req.headers({
        "APCA-API-KEY-ID": CLIENT_ID,
        "APCA-API-SECRET-KEY": CLIENT_SECRET
    }).send(order).then((res) => {
        response.send(res.body);
    });

});

app.get('/buy/:symbol/:quantity', (request, response) => {
    console.log('\x1b[32m%s\x1b[0m', request.url, new Date().toLocaleString());
    const symbol = request.params.symbol;
    const quantity = parseInt(request.params.quantity);
    let url = BASE_URL + "/v2/orders";
    let req = unirest("POST", url);

    let order = JSON.stringify({
        "symbol": symbol,
        "qty": quantity,
        "side": "buy",
        "type": "market",
        "time_in_force": "day"
    });

    req.headers({
        "APCA-API-KEY-ID": CLIENT_ID,
        "APCA-API-SECRET-KEY": CLIENT_SECRET
    }).send(order).then((res) => {
        response.send(res.body);
    });

});

/*****************************************************************
 * API: Alpaca
 * Created: 28FEB2021
 * Description: 1. Returns an object with an "is_open" property.
 * Documentation: https://alpaca.markets/docs/api-documentation/api-v2/clock
 * Usage: localhost:3000/clock
 *****************************************************************/
app.get('/clock', (request, response) => {
    console.log(request.url, new Date().toLocaleString());

    let url = BASE_URL + "/v2/clock";
    let req = unirest("GET", url);

    req.headers({
        "APCA-API-KEY-ID": CLIENT_ID,
        "APCA-API-SECRET-KEY": CLIENT_SECRET
    }).then((res) => {
        response.send(res.body);
    });

});

app.get('/delete/:id', (request, response) => {
    console.log('\x1b[36m%s\x1b[0m', request.url, new Date().toLocaleString());
    let id = request.params.id;
    let url = BASE_URL + "/v2/orders/11e8062e-c840-4490-b1ea-ea4b235cfd2f";
    let req = unirest("DELETE", url);

    req.headers({
        "APCA-API-KEY-ID": CLIENT_ID,
        "APCA-API-SECRET-KEY": CLIENT_SECRET

    }).query({}).then(res => {


        response.send(res);
    });

});

app.get('/history/debug', (request, response) => {
    console.log('\x1b[36m%s\x1b[0m', request.url, new Date().toLocaleString());
    let rawResponse = fs.readFileSync("data/schema.json");
    let parsedResponse = JSON.parse(rawResponse);
    response.send(parsedResponse);
});

app.get('/history/erase', (request, response) => {
    console.log('\x1b[36m%s\x1b[0m', request.url, new Date().toLocaleString());

    let rawdata = fs.readFileSync("data/symbols.json");
    let parsed = JSON.parse(rawdata);

    const buildSchema = (arrIn) => {
        let arrOut = [];
        arrIn.forEach(e => {
            let obj = {
                symbol: e,
                price: "",
                todaysChangePerc: "",
                c: [],
                cQuadratic: "",
                cR2: "",
                cROC: "",
                t: [],
                v: [],
                vQuadratic: "",
                vR2: "",
                vROC: "",
            };
            arrOut.push(obj);
        });
        return arrOut;
    }

    try {
        let processed = buildSchema(parsed);
        fs.writeFileSync("data\\schema.json", JSON.stringify(processed));
        response.status(204).end();
    } catch (err) {
        console.error(err);
        response.status(500).end();
    }

});

app.get('/history/save', (request, response) => {
    console.log('\x1b[36m%s\x1b[0m', request.url, new Date().toLocaleString());

    let timestamp = new Date().getTime();
    let history = fs.readFileSync("data/schema.json");
    let parsedJSON = JSON.parse(history);

    try {
        fs.writeFileSync("data\\" + timestamp + ".json", JSON.stringify(parsedJSON));
        response.status(204).end();
    } catch (err) {
        console.error(err);
        response.status(500).end();
    }

});

/**********************************************************************************************
 * Step 1. Get updated data on all tickers. Load the schema. Parse both to JSON.
 * Step 2a. Push the most current high, low, open, close, volume and time to the schema arrays.
 * Step 2b. If the array is greater than maxSize, shift the array.
 * Step 3a. Get the min-max of the closing price and unix time of every stock.
 * Step 3b. Normalize the close array and time aray between 0 and 1.
 * Step 3c. Conduct a polynomial regression of all points.
 * Step 4. Write the udpated schema to json file.
 * Step 5. Send the updated schema as a response.
 **********************************************************************************************/
app.get('/history/update', (request, response) => {
    console.log('\x1b[36m%s\x1b[0m', request.url, new Date().toLocaleString());

    let rawSchema = fs.readFileSync("data/schema.json");
    let parsedSchema = JSON.parse(rawSchema);

    const maxSize = 60;

    let url = CONFIG.polygon.baseUrl + "/v2/snapshot/locale/us/markets/stocks/tickers";
    let req = unirest("GET", url);

    req.query({
        "apiKey": CLIENT_ID
    }).then((res) => {

        for (let i = res.body.tickers.length - 1; i >= 0; i--) {

            let a = res.body.tickers[i];
            let price = a['min']['c'];
            let time = a["updated"];
            let volume = a['min']['v'];

            for (let j = parsedSchema.length - 1; j >= 0; j--) {

                let b = parsedSchema[j];

                if (b.symbol == a.ticker && price !== 0 && time !== 0 && volume !== 0) {

                    //Today's Change Percentage
                    b.todaysChangePerc = a.todaysChangePerc;
                    //Current Price
                    b.price = a.lastTrade.p;
                    //Last closing price
                    b['c'].push(price);
                    if (b['c'].length > maxSize) {
                        b['c'].shift();
                    }
                    //Time
                    b['t'].push(time);
                    if (b['t'].length > maxSize) {
                        b['t'].shift();
                    }
                    //Volume
                    b['v'].push(volume);
                    if (b['v'].length > maxSize) {
                        b['v'].shift();
                    }
                    break;
                }

            }

        }

        try {
            fs.writeFileSync("data\\schema.json", JSON.stringify(parsedSchema));
            response.status(204).end();
        } catch (err) {
            console.error(err);
            response.status(500).end();
        }

    });
});

app.get('/orders', (request, response) => {
    console.log(request.url, new Date().toLocaleString());

    let url = BASE_URL + "/v2/orders";
    let req = unirest("GET", url);

    req.headers({
        "APCA-API-KEY-ID": CLIENT_ID,
        "APCA-API-SECRET-KEY": CLIENT_SECRET
    }).then(res => {

        let filtered = [];

        for (element of res.body) {

            filtered.push({
                qty: element.qty,
                symbol: element.symbol,
                side: element.side,
                created_at: element.created_at,
                id: element.id,
                asset_id: element.asset_id,

            });
        }
        response.send(filtered);
    });

});

app.get('/portfolio/history', (request, response) => {
    console.log('\x1b[36m%s\x1b[0m', request.url, new Date().toLocaleString());

    let url = BASE_URL + "/v2/account/portfolio/history";
    let req = unirest("GET", url);

    req.headers({
        "APCA-API-KEY-ID": CLIENT_ID,
        "APCA-API-SECRET-KEY": CLIENT_SECRET
    }).then((res) => {
        response.send(res.body);
    });

});

app.get('/positions', (request, response) => {
    console.log('\x1b[36m%s\x1b[0m', request.url, new Date().toLocaleString());

    let url = BASE_URL + "/v2/positions";
    let req = unirest("GET", url);

    req.headers({
        "APCA-API-KEY-ID": CLIENT_ID,
        "APCA-API-SECRET-KEY": CLIENT_SECRET
    }).then(res => {
        return res;
    }).then(res => {

        for (e of res.body) {
            e['avg_entry_price'] = parseFloat(e['avg_entry_price']).toFixed(2);
            e['unrealized_plpc'] = parseFloat(e['unrealized_pl']).toFixed(2);
            delete e['side'];
            delete e['asset_id'];
            delete e['asset_class'];
            delete e['change_today'];
            delete e['exchange'];
            delete e['unrealized_pl'];
            delete e['lastday_price'];
            delete e['unrealized_intraday_pl'];
            delete e['unrealized_intraday_plpc'];
            delete e['current_price'];
            delete e['avg_entry_price'];
            delete e['cost_basis'];

        }

        response.send(res.body)
    });
});

app.get('/marketstatus', (request, response) => {
    console.log('\x1b[36m%s\x1b[0m', request.url, new Date().toLocaleString());

    let url = CONFIG.polygon.baseUrl + "/v1/marketstatus/now";
    let req = unirest("GET", url);

    req.query({
        "apiKey": CLIENT_ID
    }).then((res) => {

        if (res == undefined) {
            console.log('\x1b[31m%s\x1b[0m', res);
            response.send({ "market": "error" });
        } else {
            response.send(res.body);
        }

    });

});

app.get('/sell/:symbol', (request, response) => {
    console.log('\x1b[32m%s\x1b[0m', request.url, new Date().toLocaleString());

    const symbol = request.params.symbol;
    let url = BASE_URL + "/v2/positions/" + symbol;
    let req = unirest("DELETE", url);

    req.headers({
        "APCA-API-KEY-ID": CLIENT_ID,
        "APCA-API-SECRET-KEY": CLIENT_SECRET
    }).then((res) => {
        response.send(res.body);
    });

});

/*****************************************************************
 * API: Polygon
 * Description: An array of raw tickers data for ALL stock symbols
 *****************************************************************/
app.get('/tickers/debug', (request, response) => {
    console.log('\x1b[36m%s\x1b[0m', request.url, new Date().toLocaleString());
    var date = new Date(); // Or the date you'd like converted.
    let today = new Date(date.getTime() - (date.getTimezoneOffset() * 60000)).toISOString().slice(0, 10);
    let url = CONFIG.polygon.baseUrl + "/v2/snapshot/locale/us/markets/stocks/tickers" + today;
    let req = unirest("GET", url);
    req.query({
        "apiKey": CLIENT_ID
    }).then((res) => {
        response.send(res.body);
    });

});

app.get('/tickers/indicators', (request, response) => {
    console.log('\x1b[36m%s\x1b[0m', request.url, new Date().toLocaleString());
    let rawSchema = fs.readFileSync("data/schema.json");
    let parsedJSON = JSON.parse(rawSchema);

    //i loops through all the symbols
    for (let i = parsedJSON.length - 1; i >= 0; i--) {
        try {

            let symbol = parsedJSON[i];
            let cPoints = [];
            const closeLow = Math.min(...symbol['c']);
            const closeHigh = Math.max(...symbol['c']);

            let vPoints = [];
            const volumeLow = Math.min(...symbol['v']);
            const volumeHigh = Math.max(...symbol['v']);

            const timeLow = Math.min(...symbol['t']);
            const timeHigh = Math.max(...symbol['t']);
            //j loops through the arrays
            for (let j = 0; j < symbol['c'].length; j++) {
                let time = symbol['t'][j];
                let price = symbol['c'][j];
                let volume = symbol['v'][j];

                let x = map(time, timeLow, timeHigh, 0, 1);
                let cy = map(price, closeLow, closeHigh, 0, 1);
                let vy = map(volume, volumeLow, volumeHigh, 0, 1);
                cPoints.push([x, cy]);
                vPoints.push([x, vy]);

            }

            //CLOSE
            //2ax^2+bx+c
            const closeRegression = regression.polynomial(cPoints, { order: 2 });
            symbol['cQuadratic'] = closeRegression.string;
            symbol['cR2'] = closeRegression.r2;
            //2ax+b
            const cDeriveAndEvaluate = ((2 * closeRegression.equation[0]) + closeRegression.equation[1]).toFixed(2);
            symbol['cROC'] = cDeriveAndEvaluate;

            //VOLUME
            //2ax^2+bx+c
            const volumeRegression = regression.polynomial(vPoints, { order: 2 });
            symbol['vQuadratic'] = volumeRegression.string;
            symbol['vR2'] = volumeRegression.r2;
            //2ax+b
            const vDeriveAndEvaluate = ((2 * volumeRegression.equation[0]) + volumeRegression.equation[1]).toFixed(2);
            symbol['vROC'] = vDeriveAndEvaluate;

            delete symbol['c'];
            delete symbol['t'];
            delete symbol['v'];

        } catch (e) {
            console.log(e);
        }
    }

    response.send(parsedJSON);
});


/*****************************************************************
 * API: N/A
 * Description: Loads debug data from a JSON file and sends it as a response.
 *****************************************************************/
app.get('/alltickers/debug', (request, response) => {
    console.log('\x1b[36m%s\x1b[0m', request.url, new Date().toLocaleString());
    let rawSchema = fs.readFileSync("data/alltickers.json");
    let parsedJSON = JSON.parse(rawSchema);
    response.send(parsedJSON);
});