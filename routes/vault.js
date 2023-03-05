const { Worker } = require("worker_threads");

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