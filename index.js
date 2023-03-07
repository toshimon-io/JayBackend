// load up the express framework and body-parser helper
const express = require('express');
const bodyParser = require('body-parser');
var CronJob = require('cron').CronJob;
const ethers = require('ethers');
const JAY_CONTRACT = require('./constants/contracts');




// create an instance of express to serve our end points
const app = express();

// we'll load up node's built in file system helper library here
// (we'll be using this later to serve our JSON files
const fs = require('fs');
var expressWs = require('express-ws')(app);

// configure our express instance with some body-parser settings
// including handling JSON data
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

var cors = require('cors')

app.use(cors())

const routes = require('./routes/routes.js')(app, fs);

const job = new CronJob('*/5 * * * * *', function() {
    fs.readFile('./data/prices.json', 'utf8', async (err, dataa) => {
        const data = JSON.parse(dataa)
        const _infuraProvider = new ethers.ethers.EtherscanProvider(
            'goerli',
            'A7257M9X55EPEKRDUNV1Q4JH65YM7NKHIT'
          );
          
          try{
                const lastBlock = await _infuraProvider.getBlockNumber();
                const prices = await getPriceData(data.lastBlock, lastBlock);
                if(prices.length > 0){
                    const _data = {
                        lastBlock,
                        prices: [...data.prices, ...prices]
                    }
                    fs.writeFile('./data/prices.json', JSON.stringify(_data, null, 2), async (file2) => {
                        console.log("priceUpdate")
                    });

                }
          } catch {}
        
    }, true);
  console.log('Every Tenth Minute:');
});
job.start();


const getPriceData = async (lastBlock, newLastblock) => {
  
    const _infuraProvider = new ethers.ethers.getDefaultProvider('goerli', {
        etherscan: 'A7257M9X55EPEKRDUNV1Q4JH65YM7NKHIT',
        infura: '28c9e86d104c418384155940687a2b9b',
        // alchemy: 'g1GPr8Zqbwwnnc14xhraypg1rWB-1Neq',
        alchemy: 'fIsvO5eINfwXeT-GPtBFBLoXLZSwyjAx', // main
        // pocket: '95f40ef6a91572c9d6fdfc4b2c74523519186ba6cead77c4a0a87c2dc7110a33'
        pocket: '569b9d450a6822d605df887c8ccb798c4605e0bf246944a34ef8d11d2d900365' // main
      })
    
      const _jayContract = new ethers.ethers.Contract(
        JAY_CONTRACT[5].address,
        JAY_CONTRACT[5].abi,
        _infuraProvider
      );

      const eventFilter = _jayContract.filters.Price();
    
      const events = await _jayContract.queryFilter(eventFilter, lastBlock, newLastblock);



      const arrays = [];
      events.forEach((o) => {
        //console.log(o.args.time)
        const date = Number(o.args.time);
        //console.log(date)
        const sent = Number(ethers.ethers.formatEther(o.args.sent))?.toFixed(8) || 0;
        //console.log(sent)
        const rec = Number(ethers.ethers.formatEther(o.args.recieved))?.toFixed(8) || 1;
        //console.log(rec)
        const price = sent / rec;
        arrays.push([date, price, price, price, price]);
        return null;
      });
    
      return arrays;
}

// this is where we'll handle our various routes from


// finally, launch our server on port 3001.
const server = app.listen(process.env.PORT || 5000);

