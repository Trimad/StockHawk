let sell = false;
let buy = false;
let live = false;

//Buy Filters
var filterMinPrice, filterMaxPrice, filterR2Cutoff, filterMinROC, filterTimeWindow;
//Sell Filters
let filterStopLoss, filterTakeProfit, filterPanicPrice;

var tickers = [], tickersFiltered = [];
var positions = [], positionsFiltered = [];
var is_open;
var accountActivity = [];
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

const getData = async (url) => {
    let response = await fetch(url);
    if (response.status !== 204) {
        try {
            return await response.json(); //returns a promise that must be resolved
        } catch (e) { console.log(e, url); }

    }
}

const buildTable = (globalArray, headID, bodyID) => {

    if (globalArray.length > 0) {
        let keys = Object.keys(globalArray[0]);

        let thead = document.getElementById(headID);
        let theadFrag = document.createDocumentFragment();
        //Table Head
        let thRow = document.createElement('tr');
        for (k of keys) {
            let th = document.createElement('th');
            th.innerHTML = k;
            thRow.appendChild(th);
        }
        theadFrag.appendChild(thRow);
        thead.innerHTML = "";
        thead.appendChild(theadFrag);
        //Table Body
        let tbody = document.getElementById(bodyID);
        let tbodyFrag = document.createDocumentFragment();
        globalArray.forEach(element => {
            let tr = document.createElement('tr');
            for (k of keys) {
                let td = document.createElement('td');
                td.innerHTML = element[k];
                tr.appendChild(td);
            }
            tbodyFrag.appendChild(tr);
        });

        tbody.innerHTML = "";
        tbody.appendChild(tbodyFrag);
    }
}

function setup() {
    frameRate(1);
    noCanvas();
    toggleBuy();
    toggleLive();
    toggleSell();
    getAccount();
    getMarketStatus();
    getAccountActivity();
    updateFilters();
    //updateScoreboard();

}

function draw() {

    if (live) {
        updateTimer(); //ticks every second
        if (frameCount % 60 === 0) {
            //Call these functions regardless of whether or not the market is open.
            getAccount();
            getAccountActivity();
            getMarketStatus();
            //updateScoreboard();

            //Update the histories on the API side
            let promiseA = getData('http://localhost:3000/history/update');
            promiseA.then(() => {
                //Then get the ticker indicators based on those histories
                let promiseB = getData('http://localhost:3000/tickers/indicators');
                promiseB.then(resB => {
                    tickers = resB;
                    //Then get owned positions
                    let promiseC = getData("http://localhost:3000/positions");
                    promiseC.then(resC => {
                        positions = resC;
                        Trade.filterPositions();//debugging
                        if (sell && is_open === "open") {
                            Trade.filterPositions().sell();
                        }
                        Trade.filterTickers();//debugging
                        if (buy && is_open === "open") {
                            Trade.filterTickers().buy();
                        }
                    });
                });
            });
        }
    }
}

function getMarketStatus() {
    let promise = getData("http://localhost:3000/clock");
    promise.then(response => {

        //If the market status changes,
        if (is_open !== response.is_open) {
            //set global variable market to the new status,
            is_open = response.is_open;
            //then change the color of the feather.
            if (is_open) {
                document.getElementById('feather').classList.add("open");
                document.getElementById('feather').classList.remove("closed");
                document.getElementById('feather').classList.remove("other");
            } else if (!is_open) {
                document.getElementById('feather').classList.remove("open");
                document.getElementById('feather').classList.add("closed");
                document.getElementById('feather').classList.remove("other");
            } else {
                document.getElementById('feather').classList.remove("open");
                document.getElementById('feather').classList.remove("closed");
                document.getElementById('feather').classList.add("other");
            }
        }

    });
}

var account;

function getAccount() {

    let promise = getData("http://localhost:3000/account");

    promise.then(response => {
        try {
            let tbody = document.getElementById('account-tbody');
            let frag = document.createDocumentFragment();
            account = response;
            let keys = Object.keys(account);
            for (let k of keys) {
                let tr = document.createElement('tr');
                let label = document.createElement('th');
                label.innerHTML = k;
                let data = document.createElement('td');
                data.innerHTML = response[k];
                tr.appendChild(label);
                tr.appendChild(data);
                frag.appendChild(tr);
            }
            tbody.innerHTML = "";
            tbody.appendChild(frag);
        } catch (e) {
            console.log(e);
        }
    });

}


function getAccountActivity() {
    let promise = getData("http://localhost:3000/account/activity");
    promise.then(response => {
        accountActivity = response;
        buildTable(accountActivity, "account-activity-thead", "account-activity-tbody");
    });
}

function updateTimer() {
    document.getElementById('timer').style.width = map(frameCount % 60, 0, 60, 0, 100) + "%";
    document.getElementById('timer-text').innerHTML = frameCount;
}

function isDayTrade(symbol) {
    for (let i = 0; i < accountActivity.length; i++) {
        let e = accountActivity[i];
        if (symbol === e.symbol) {
            return true;
        }
    }
    return false;
}

function updateFilters() {
    //Buy Filters
    filterMinPrice = document.getElementById('min-price').value;
    filterMaxPrice = document.getElementById('max-price').value;
    filterR2Cutoff = document.getElementById('r2-cutoff').value;
    filterTimeWindow = document.getElementById('time-window').value;
    filterMinROC = document.getElementById('min-roc').value;
    //Sell Filters
    filterTakeProfit = document.getElementById('take-profit').value;
    filterStopLoss = document.getElementById('stop-loss').value;
    filterPanicPrice = document.getElementById('price-panic-sell').value;
    Trade.filterPositions().filterTickers();

}

function toggleLive() {
    live = !live;
    let button = document.getElementById('toggle-live-text');
    if (live) {
        //Cards
        document.getElementById('account').classList.remove("card-off");
        document.getElementById('account').classList.add("card-on");
        document.getElementById('account-activity').classList.remove("card-off");
        document.getElementById('account-activity').classList.add("card-on");
        //Buttons
        button.innerHTML = "Pause Program"
        document.getElementById('toggle-live-icon').classList.remove("fa-pause");
        document.getElementById('toggle-live-icon').classList.add("fa-play");
    } else {
        //Cards
        document.getElementById('account').classList.remove("card-on");
        document.getElementById('account').classList.add("card-off");
        document.getElementById('account-activity').classList.remove("card-on");
        document.getElementById('account-activity').classList.add("card-off");
        //Buttons
        button.innerHTML = "Resume Program"
        document.getElementById('toggle-live-icon').classList.remove("fa-play");
        document.getElementById('toggle-live-icon').classList.add("fa-pause");
        if (buy) {
            toggleBuy();
        }
        if (sell) {
            toggleSell();
        }
    }

}

function toggleBuy() {
    buy = !buy;
    let button = document.getElementById('toggle-buy-text');
    if (buy) {
        button.innerHTML = "Pause Buying"
        document.getElementById('tickers').classList.remove("card-off");
        document.getElementById('tickers').classList.add("card-on");
        document.getElementById('toggle-buy-icon').classList.remove("fa-pause");
        document.getElementById('toggle-buy-icon').classList.add("fa-play");
    } else {
        button.innerHTML = "Resume Buying"
        document.getElementById('tickers').classList.remove("card-on");
        document.getElementById('tickers').classList.add("card-off");
        document.getElementById('toggle-buy-icon').classList.remove("fa-play");
        document.getElementById('toggle-buy-icon').classList.add("fa-pause");
    }

}

function toggleSell() {
    sell = !sell;
    let button = document.getElementById('toggle-sell-text');
    if (sell) {
        button.innerHTML = "Pause Selling"
        document.getElementById('positions').classList.remove("card-off");
        document.getElementById('positions').classList.add("card-on");
        document.getElementById('toggle-sell-icon').classList.remove("fa-pause");
        document.getElementById('toggle-sell-icon').classList.add("fa-play");
    } else {
        button.innerHTML = "Resume Selling"
        document.getElementById('positions').classList.remove("card-on");
        document.getElementById('positions').classList.add("card-off");
        document.getElementById('toggle-sell-icon').classList.remove("fa-play");
        document.getElementById('toggle-sell-icon').classList.add("fa-pause");
    }

}

async function eraseHistory() {
    let response = await fetch("http://localhost:3000/history/erase");
}

async function saveHistory() {
    let response = await fetch("http://localhost:3000/history/save");
}

// function isViable(daysOld, percent) {
//     let cutoff = -Math.exp(Math.log10(daysOld - 1.0)) + 10.0;
//     return (percent >= cutoff) ? true : false;
// }

function updateScoreboard() {

    let wins = 0;
    let winPercent = 0;
    let losses = 0;
    let lossPercent = 0;

    for (let i = 0; i < positions.length; i++) {

        if (positions[i]["current_price"] > positions[i]["avg_entry_price"]) {
            wins++;
            winPercent += parseFloat(positions[i]["unrealized_plpc"]);
        } else {
            losses++;
            lossPercent += parseFloat(positions[i]["unrealized_plpc"]);
        }

    }

    winPercent /= wins;
    winPercent = (winPercent * 100).toFixed(2) + "%";
    lossPercent /= losses;
    lossPercent = parseFloat(lossPercent * 100).toFixed(2) + "%";
    document.getElementById('stats-win').innerHTML = wins;
    document.getElementById('stats-loss').innerHTML = losses;
    document.getElementById('stats-win-average').innerHTML = winPercent;
    document.getElementById('stats-loss-average').innerHTML = lossPercent;
}