
function buildTable() {
    let arr = Helper.loadData("../reference.json");
    Helper.buildTable(arr, 'reference-thead', 'reference-tbody');
}
