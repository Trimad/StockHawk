class Trade {
    constructor() { }

    static async foo() {
        const data = await this.bar();
        data.key = value;
        return data;
    }
    static async bar() {
        return { foo: 1, bar: 2 }
    }

    static filterTickers() {
        if (tickers.length > 0) {
            tickersFiltered = tickers.filter(function (e) {
                return (
                    e.price >= filterMinPrice &&
                    e.price <= filterMaxPrice &&
                    e.todaysChangePerc > 0 &&
                    e.cR2 >= filterR2Cutoff &&
                    e.cROC > filterMinROC &&
                    e.vR2 >= filterR2Cutoff &&
                    e.vROC > filterMinROC
                )
            });
            buildTable(tickersFiltered, "tickers-thead", "tickers-tbody");
        }
        return this;
    }

    static filterPositions() {
        //Combine the tickers and the positions
        if (positions.length > 0) {
            let merged = merge(positions, tickers);
            function merge(a, b) {
                let combined = [];
                tickers.forEach(t => {
                    positions.forEach(p => {
                        if (t['symbol'] === p['symbol']) {
                            let obj = Object.assign({}, t, p)
                            combined.push(obj);
                        }
                    });
                });
                return combined;
            }
            //Filter the positions into a list of stocks to be sold
            positionsFiltered = positions.filter(function (e) {
                let a = e["unrealized_plpc"];
                //let delta = e["cROC"];
                let b = filterStopLoss;
                let c = filterTakeProfit;
                //return (a <= b || a >= c || delta <= filterPanicPrice);
                return (a <= b || a >= c);
            });
            buildTable(merged, "positions-thead", "positions-tbody");
        }
        return this;
    }

    static buy() {
        if (frameCount >= filterTimeWindow * 60) {
            tickersFiltered.forEach(e => {
                if (isDayTrade(e.symbol) === false) {
                    if (e.price <= account.buying_power) {
                        let promise = getData("http://localhost:3000/buy/" + e.symbol + "/1");
                        promise.then(res => {
                            return res;
                        });
                    }
                }
            });
        }
    }

    static sell() {
        positionsFiltered.forEach(e => {
            if (!isDayTrade(e.symbol)) {
                let promise = getData("http://localhost:3000/sell/" + e.symbol);
                promise.then(res => {
                    return res;
                });
            }
        });
    }

    static bracketOrder() {
        if (frameCount >= filterTimeWindow * 60) {
            tickersFiltered.forEach(e => {
                if (isDayTrade(e.symbol) === false) {
                    if (e.price < account.buying_power) {
                        const quantity = 1;
                        let a = e["unrealized_plpc"];
                        let stopLoss = a + a * filterStopLoss;
                        let takeProfit = a + a * filterTakeProfit;
                        let promise = getData("http://localhost:3000/buy/" + e.symbol + "/" + quantity + "/" + stopLoss.toFixed(2) + "/" + takeProfit.toFixed(2));
                        promise.then(res => {
                            return res;
                        });
                    }
                }
            });
        }
    }


}