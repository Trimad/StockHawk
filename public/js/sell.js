let stocks;

function btnGetSlopes() {
  
  fetch("http://localhost:3000/myshares/slopes")
    .then((response) => {
      return response.json();
    })
    .then((json) => {
      stocks = json;
      console.log(stocks);
    });
    
  document.getElementById("btn-buildtable").disabled = false;
  document.getElementById("btn-sorttable").disabled = false;
}

function btnBuildTable() {
  let tableBody = document.getElementById('table-body');
  tableBody.innerHTML = null;
  tableBody.innerHTML = "";

  let frag = document.createDocumentFragment();

  //CONSTRUCT THE TABLE HEAD
  let head = document.createElement('tr');
  for (let k in stocks[0]) {
    let th = document.createElement('th');
    th.innerHTML = k;
    head.appendChild(th);
  }
  frag.appendChild(head);

  //CONSTRUCT THE TABLE BODY
  for (let i = 0; i < stocks.length; i++) {
    let tr = document.createElement('tr');
    for (let k in stocks[i]) {
      let td = document.createElement('td');
      let value = stocks[i][k];
      td.innerHTML = value;
      if (k === "y") { if (value <= 0.5) { td.classList.add("negative"); } else if (value > 0.5) { td.classList.add("positive"); } }
      if (k === "slope") { if (value <= 0) { td.classList.add("negative"); } else if (value > 0) { td.classList.add("positive"); } }
      if (k === "r2") { if (value <= 0.6) { td.classList.add("negative"); } else if (value > 0.6) { td.classList.add("positive"); } }
      tr.appendChild(td);
    }
    frag.appendChild(tr);
  }

  tableBody.appendChild(frag);
  
}

function btnSortTable() {
  sortTable();
  btnBuildTable();
}

function sortTable() {
  stocks.sort((a, b) => parseFloat(b.slope) - parseFloat(a.slope)); 
}