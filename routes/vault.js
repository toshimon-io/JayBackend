const { Worker } = require("worker_threads");
var CronJob = require('cron').CronJob;

  const vaultRoutes = (app, fs) => {

    //...unchanged ^^^
  
    // refactored helper methods
    const dataPath = "./data/vault.json"
    const readFile = (
      callback,
      returnJson = false,
      filePath = dataPath,
      encoding = 'utf8'
    ) => {
      fs.readFile(filePath, encoding, (err, data) => {
        if (err) {
          throw err;
        }
  
        callback(returnJson ? JSON.parse(data) : data);
      });
    };
    app.ws('/echo', function(ws, req) {
      let length = 0;
      fs.readFile('./data/prices.json', 'utf8', (err, data) => {
          const _data = (JSON.parse(data)).prices;
          length = _data.length;
          ws.send(JSON.stringify(_data));
      }, true);

      const job2 = new CronJob('*/50 * * * * *', function() {
          console.log("BrodcastStart")
          fs.readFile('./data/prices.json', 'utf8', (err, data) => {
            const _data = (JSON.parse(data)).prices;
            if(_data.length > length){
              length = _data.length;
              ws.send(JSON.stringify(_data));
            }
          }, true);

      });
      ws.onclose = () =>{
        console.log("closed");
        job2.stop();
      }
      
      job2.start();

    });
    // READ
    // Notice how we can make this 'read' operation much more simple now.
    app.get('/vault', (req, res) => {
        fs.readFile('./data/vault.txt', 'utf8', (err, file) => {
            readFile((data) => {
                data.running = file;
                console.log(req.body);
                res.send(data);
            }, true);
        })
    });
    app.get('/prices', (req, res) => {
      fs.readFile('./data/prices.json', 'utf8', (err, file) => {
          const data = JSON.parse(file);
              console.log(req.body);
              res.send(data);
      })
  });

    app.post("/vault", async (req, res) => {
        const worker = new Worker("./workers/worker.js");

        worker.on("message", (data) => {
          res.status(200).send(`result is ${data}`);
        });
        worker.on("error", (msg) => {
          console.log(msg);
          res.status(404).send(`An error occurred: ${msg}`);
        });
      });
  };
  
  module.exports = vaultRoutes;