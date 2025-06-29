const MAXLOBBYAMOUNT = 20;

const express = require('express');
var cors = require('cors');
const app = express();

app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(cors());

let responses = {}
let data = {}
app.get('/api/getdata', function(req, res) {
  if (req.method == "OPTIONS"){
    res.set("Access-Control-Allow-Origin", "https://html-classic.itch.zone")
    res.connection.destroy();
  }
  let room;
  if (req.headers.hasOwnProperty("creating") === true && req.headers.hasOwnProperty("first-time")){
    if (size_dict(data) <= MAXLOBBYAMOUNT){
      room = makeid(4);
    } else {
      console.log("Could not create room because max rooms.")
      let info = {
        "type": "quit"
      }
      res.json(info);
      res.connection.destroy();
      return;
    }
    
  } else {
    room = req.get('room');
  }
  
  if (data.hasOwnProperty(room) === false && req.headers.hasOwnProperty("creating") === true && req.headers.hasOwnProperty("first-time") === true){
    data[room] = {};
    data[room]['clients'] = {};
  } else if (data.hasOwnProperty(room) === false) {
    console.log("Game not found.")
      let info = {
        "type": "quit"
      }
    res.json(info);
    res.connection.destroy();
    return;
  }
  data[room]['lastRequest'] = Date.now();
  if (req.headers.hasOwnProperty("first-time") === true) {
    //data[room]['clients'][req.get('clientId')] = [];
    res.setHeader('Content-Type', 'application/json');
    if (data[room].hasOwnProperty('playercount') === false){
      data[room]['playercount'] = 1;
    } else {
      data[room]['playercount'] += 1;
    }
    data[room]['clients'][data[room]['playercount']] = [];
    console.log(data[room])
    let info = {
      "type": "packet",
      "packet": {
        "action":"info",
        "data": {
          "dataType": "playercount " + room,
          "value": data[room]['playercount']
        }
      }
    }
    res.json(info);
    res.connection.destroy();
    data[room]['clients'][data[room]['playercount']] = [];

    return;
  }
  let clientId = req.get('clientId');
  let respObj = {
    "res": res,
    "clientId": clientId
  }
  if (responses.hasOwnProperty(room) === false) {
    responses[room] = [];
  }
  console.log(data[room])
  if (data[room]['clients'][clientId].length !== 0){
    res.json(data[room]['clients'][clientId][0]);
    res.connection.destroy();
    data[room]['clients'][clientId].shift();
    console.log("Returned 1 missed packet.")
    return;
  }
  responses[room].push(respObj);
  for (const [key, value] of Object.entries(data)) {
    if (Math.abs(Date.now() - value["lastRequest"]) >= 300000){
      delete data[key];
      delete responses[key];
      console.log("One lobby deleted:" + key)
    }
  }
});
app.post('/api/postdata', function(req, res) {
  if (req.method == "OPTIONS"){
    res.set("Access-Control-Allow-Origin", "https://html-classic.itch.zone")
    res.connection.destroy();
  }
  res.set("Access-Control-Allow-Origin", "https://html-classic.itch.zone")
  let room = req.get('room');
  let clientId = req.get('clientId');
  if (responses.hasOwnProperty(room) === false) {
    responses[room] = [];
  }
  console.log(req.body);
  for (const [key, value] of Object.entries(data[room]['clients'])) {
    let isin = false;
    for (let i = 0; i < responses[room].length; i++){
      if (responses[room][i]['clientId'] === key){
        isin = true;
      }
    }
    if (isin === false && clientId !== key){
      console.log("Someone missed a packet");
      data[room]['clients'][key].push(req.body);
    }
    
  }
  let newResp = [];
  for (let i = 0; i < responses[room].length; i++) {
    let res1 = responses[room][i]
    if (res1['clientId'] !== clientId) {
      res1['res'].setHeader('Content-Type', 'application/json');
      res1['res'].json(req.body);
      res1['res'].connection.destroy();
    }else {
      newResp.push(res1);
    }
  }
  responses[room] = newResp;
  res.sendStatus(200);
  res.connection.destroy();
});
  
function makeid(length) {
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const charactersLength = characters.length;
    let counter = 0;
    while (counter < length) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
      counter += 1;
    }
    return result;
}
function size_dict(d){c=0; for (i in d) ++c; return c}

app.get('/', function(req, res) {
  res.send("ok " + "(pelejä käynnissä " + size_dict(data) + ")")
})

app.listen(8080, function() {
  console.log('Server listening on port 8080!')
})
