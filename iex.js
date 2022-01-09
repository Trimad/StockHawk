const fs = require('fs');
const fetch = require('node-fetch');
const express = require('express');
const regression = require('regression');

var bodyParser = require('body-parser');

app = express();
app.use(express.static('public')); //enable all CORS requests
app.use(bodyParser.urlencoded({ extended: true })); //enable POST requests

const server = app.listen(3000, () => {
    console.log("listening...");
});

Array.prototype.splitSymbols = function () {

    let symbols = this;

    for (var arr = [], i = 0; i < symbols.length; i++) {
        const s = symbols[i];
        if (s.symbol) {
            arr.push(s.symbol);
        }
    }

    const uniqueSet = new Set(arr);//remove duplicates
    const backToArray = [...uniqueSet];//remove duplicates

    return backToArray;
}

const map = function (n, start1, stop1, start2, stop2) {
    return ((n - start1) / (stop1 - start1)) * (stop2 - start2) + start2;
};

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

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

const subdomain = "sandbox";
const config = JSON.parse(loadData("config.json"));
const token = config.iex.testKey;

app.get('/symbols/live', (request, response) => {
    console.log(request.url, new Date().toLocaleString());
    let url = "https://api.iextrading.com/1.0/ref-data/symbols";
    console.log(url);
    fetch(url)
        .then((response) => {
            return response.json();
        })
        .then((json) => {
            storeData(json, "data/symbols.json");
            response.send(json);
        });
});

app.get('/symbols/cached', (request, response) => {
    console.log(request.url, new Date().toLocaleString());
    const data = loadData("data/symbols.json");
    response.send(data);
});

app.get('/market/data/live', function (request, response) {
    console.log(request.url, new Date().toLocaleString());
    let data = [];
    const symbols_json = JSON.parse(loadData("data/symbols.json"));
    const symbols = symbols_json.splitSymbols();

    (async function loop() {

        for (let i = 0; i < symbols.length; i++) {
            let s = symbols[i];
            console.log(s);

            let url = "https://" + subdomain + ".iexapis.com/stable/stock/" + s + "/batch?types=chart,quote&range=1y&filter=symbol,close,date,week52Low,week52High,latestPrice,&token=" + token;

            fetch(url)
                .then((response) => {
                    if (response.status !== 200) {
                        throw new Error('Network response was not OK. Response status: ' + response.status);
                    }
                    return response.json();
                })
                .then((json) => {
                    data.push(json);
                })
                .catch((error) => {
                    console.error('Error:', error);
                });

            await delay(333);
        }

        let json = JSON.stringify(data);
        fs.writeFile("data/year.json", json, (err) => {
            if (err) throw err;
            console.log('Data written to file.');
            response.send(data);
        });

    })();
});

app.get('/market/data/cached', (request, response) => {
    console.log(request.url, new Date().toLocaleString());
    let data = JSON.parse(loadData("data/year.json"));
    response.send(data);
});

app.get('/market/slopes', (request, response) => {
    console.log(request.url, new Date().toLocaleString());
    let rawData = JSON.parse(loadData("data/year.json"));
    let stocks = calculateSlopes(rawData);
    response.send(stocks);
});

app.get('/myshares/data/live', (request, response) => {
    console.log(request.url, new Date().toLocaleString());
    let data = [];
    const symbols_json = JSON.parse(loadData("data/myshares-meta.json"));
    const symbols = symbols_json.splitSymbols();

    (async function loop() {

        for (let i = 0; i < symbols.length; i++) {
            let s = symbols[i];
            console.log(i, s);

            let url = "https://" + subdomain + ".iexapis.com/stable/stock/" + s + "/batch?types=chart,quote&range=1y&filter=symbol,close,date,week52Low,week52High,latestPrice,&token=" + token;
            console.log(url);
            fetch(url)
                .then((response) => {
                    if (response.status !== 200) {
                        throw new Error('Network response was not OK. Response status: ' + response.status);
                    }
                    return response.json();
                })
                .then((json) => {
                    data.push(json);
                })
                .catch((error) => {
                    console.error('Error:', error);
                });

            await delay(333);
        }

        let json = JSON.stringify(data);
        fs.writeFile("data/myshares.json", json, (err) => {
            if (err) throw err;
            console.log('Data written to file.');
            response.send(data);
        });

    })();

});

app.get('/myshares/data/cached', (request, response) => {
    console.log(request.url, new Date().toLocaleString());
    let data = JSON.parse(loadData("data/myshares.json"));
    response.send(data);
});

function calculateSlopes(rawData) {
    let stocks = [];
    for (stock of rawData) {

        let points = [];
        try {
            const low = stock.quote.week52Low;
            const high = stock.quote.week52High;
            const start = Math.round(new Date(stock.chart[0].date) / 1000);
            const stop = Math.round(new Date(stock.chart[stock.chart.length - 1].date) / 1000);

            for (c of stock.chart) {
                let close = c.close;
                let date = Math.round(new Date(c.date) / 1000);
                let x = map(date, start, stop, 0, 1);
                let y = map(close, low, high, 0, 1);
                points.push([x, y]);
            }

        } catch (e) {
            //console.log(stock.quote.symbol, e);
        }
        //2ax^2+bx+c
        const quadratic = regression.polynomial(points, { order: 2 });
        //console.log(stock);
        //y=1
        const y = (quadratic.equation[0] + quadratic.equation[1] + quadratic.equation[2]);
        //2ax+b
        const derivative = ((2 * quadratic.equation[0]) + quadratic.equation[1]).toFixed(2);

        if (!isNaN(derivative)) {
            stocks.push({
                "symbol": stock.quote.symbol,
                "lastClose": stock.quote.latestPrice,
                "quadratic": quadratic.string,
                "slope": derivative,
                "y": y.toFixed(2),
                "r2": quadratic.r2,
            });
        }
    }
    return stocks;
}

app.get('/myshares/slopes', (request, response) => {
    console.log(request.url, new Date().toLocaleString());
    let apiData = JSON.parse(loadData("data/myshares.json"));
    let slopeData = calculateSlopes(apiData);
    let myData = JSON.parse(loadData("data/myshares-meta.json"));
    for (m of myData) {
        for (s of slopeData) {
            if (s.symbol === m.symbol) {
                m = Object.assign(m, s);
            }
        }
    }
    response.send(myData);
});

app.post('/myshares', function (request, response) {
    console.log(request.url, new Date().toLocaleString());

    let symbol = request.body.symbol;
    let name = request.body.name;
    let purchaseDate = request.body.purchaseDate;
    let purchasePrice = request.body.purchasePrice;
    let howMany = request.body.howMany;

    response.send(symbol + ", " + name + ", " + purchaseDate + ", " + purchasePrice);

    let data = JSON.parse(loadData("data/myshares-meta - Copy.json"));


    let share = {
        "symbol": symbol,
        "name": name,
        "purchase-date": purchaseDate,
        "purchase-price": purchasePrice
    };

    for (let i = 0; i < howMany; i++) {
        data.push(share);
    }

    let json = JSON.stringify(data);
    fs.writeFile("data/myshares-meta - Copy.json", json, (err) => {
        if (err) throw err;
        console.log('Data written to file.');
    });

    // response.sendStatus(200);
});