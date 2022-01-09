const express = require('express');
const bodyParser = require('body-parser');

app = express();
app.use(express.static('public')); //enable all CORS requests
app.use(bodyParser.urlencoded({ extended: true })); //enable POST requests

let Parser = require('rss-parser');
let parser = new Parser();

(async () => {
 
    let feed = await parser.parseURL('https://www.sec.gov/cgi-bin/browse-edgar?action=getcurrent&CIK=&type=4&company=&dateb=&owner=include&start=0&count=40&output=atom');
    console.log(feed.title);
   
    feed.items.forEach(item => {
      console.log(item.title + ':' + item.link)
    });
   
  })();

const server = app.listen(3000, () => {
console.log("listening..."); 
});