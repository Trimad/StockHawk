let symbols;
let stocks;
let filteredStocks;

function btnGetSlopes() {
  model.reset();
  fetch("http://localhost:3000/market/slopes")
    .then((response) => {
      return response.json();
    })
    .then((json) => {
      stocks = json;
      console.log(stocks);
      document.getElementById("btn-buildtable").disabled = false;
      document.getElementById("btn-sortdesc").disabled = false;
      document.getElementById("btn-sortasc").disabled = false;
    });

}

function btnBuildTable() {
  model.filterStocks().buildTable();
}

function btnSortDesc() {
  model.sortDesc().buildTable();
}

function btnSortAsc() {
  model.sortAsc().buildTable();
}

const model = {

  filterStocks() {

    const maxHistories = Number(document.getElementById("max-histories").value);
    const minPrice = Number(document.getElementById("min-price").value);
    const maxPrice = Number(document.getElementById("max-price").value);
    let arr = [];
    for (let i = 0, counter = 0; i < stocks.length; i++) {
      const stock = stocks[i];
      if (counter < maxHistories) {
        try {
          const close = stocks[i].lastClose;
          if (close <= maxPrice && close > minPrice && stocks[i].slope !== null) {
            arr.push(stock);
            counter++;
          }
        } catch (e) { }
      }

    }
    console.log(arr);
    filteredStocks = arr;
    return this;
  },
  buildTable() {
    let tableBody = document.getElementById('table-body');
    tableBody.innerHTML = null;
    tableBody.innerHTML = "";

    let frag = document.createDocumentFragment();

    //CONSTRUCT THE TABLE HEAD
    let head = document.createElement('tr');
    for (let k in filteredStocks[0]) {
      let th = document.createElement('th');
      th.innerHTML = k;
      head.appendChild(th);
    }
    frag.appendChild(head);

    //CONSTRUCT THE TABLE BODY
    for (let i = 0; i < filteredStocks.length; i++) {
      let tr = document.createElement('tr');
      for (let k in filteredStocks[i]) {
        let td = document.createElement('td');
        let value = filteredStocks[i][k];
        td.innerHTML = value;
        if (k === "y") { if (value <= 0.5) { td.classList.add("negative"); } else if (value > 0.5) { td.classList.add("positive"); } }
        if (k === "slope") { if (value <= 0) { td.classList.add("negative"); } else if (value > 0) { td.classList.add("positive"); } }
        if (k === "r2") { if (value <= 0.6) { td.classList.add("negative"); } else if (value > 0.6) { td.classList.add("positive"); } }
        tr.appendChild(td);
      }
      frag.appendChild(tr);
    }

    tableBody.appendChild(frag);
    return this;
  }, reset() {
    stocks = [];
    return this;
  }, sortDesc() {
    filteredStocks.sort((a, b) => parseFloat(b.slope) - parseFloat(a.slope));
    return this;
  }, sortAsc() {
    filteredStocks.sort((a, b) => parseFloat(a.slope) - parseFloat(b.slope));
    return this;
  }

}

