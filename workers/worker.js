const { parentPort } = require("worker_threads");
const axios = require('axios');
const fs = require('fs');
const ethers = require('ethers');

const JAY_CONTRACT = require('../constants/contracts');

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

const writeFile = (
  fileData,
  callback,
  filePath = dataPath,
  encoding = 'utf8'
) => {
  fs.writeFile(filePath, fileData, encoding, (err) => {
    if (err) {
      throw err;
    }

    callback();
  });
};

function sleep(ms) {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });


}

const getOpenseaCollections = async (next, data = []) => {
    const url = `https://api.opensea.io/api/v1/collections?asset_owner=0xf2919D1D80Aff2940274014bef534f7791906FF2&limit=300${next !== 0 ? `&offset=${next}` : ''}`;
    try{
        sleep(100);
        const response = await axios.get(url) // API supports a cursor param (?after=)
        data.push(...response.data);
        if (response.data.length < 300) return data;
        return getOpenseaCollections(next + 300, data);
    } catch {
        await sleep(60000);
        return getOpenseaCollections(next, data);
    }
  };
  async function promiseAllInBatches(task, items, batchSize) {
    let position = 0;
    let results = [];
    while (position < items.length) {
        await sleep(100);
        const itemsForBatch = items.slice(position, position + batchSize);
        results = [...results, ...await Promise.all(itemsForBatch.map(item => task(item)))];
        position += batchSize;
    }
    return results;
}
const updateSlugs =
    async (_data, _vaultOpensea, _pageKey) => {
        return new Promise(resolve => {
        fs.readFile('./data/slugs.txt', 'utf8', async (err, _slugdata) => {
            let slugdata = JSON.parse(_slugdata.toString())



            for(c of _data){
                if(!c?.primary_asset_contracts[0]?.address && !slugdata[c.slug]){

                    const options = {
                        method: 'GET',
                        url: 'https://api.opensea.io/api/v1/assets',
                        params: {
                        collection_slug: c.slug,
                        order_direction: 'desc',
                        limit: '1',
                        include_orders: 'false'
                        },
                        headers: {accept: 'application/json', 'X-API-KEY': ' '}
                    };
                    
                    const data = await axios.request(options)

                    const _addy = data.data.assets[0]?.asset_contract?.address;
                    if(_addy){
                        slugdata[c.slug] = _addy;
                    }
                }
            }
            fs.writeFile('./data/slugs.txt', JSON.stringify(slugdata, null, 2), async () => {
                resolve( );
            })
        })
    })

}

const getAlchemyCollections =
    async (_data, _vaultOpensea, _pageKey) => {
        return new Promise(resolve => {
        fs.readFile('./data/slugs.txt', 'utf8', async (err, _slugdata) => {
        let slugdata = JSON.parse(_slugdata.toString())

        let floors = {}
        const apiKey = '6Wja7xUMnVb9zeft1oOf8GaSxJ1CKImm';
        for(c of _data){
            if(!c?.primary_asset_contracts[0]?.address && slugdata[c.slug]){
                c.primary_asset_contracts.push({address: slugdata[c.slug]})
            }
        }
        await sleep(100);

            const vaultOpensea = await promiseAllInBatches(async (c) => {
                // replace with the wallet address you want to query for NFTs
                let floor = 0;
                if(c?.stats?.thirty_day_volume && c.stats.thirty_day_volume > 0 ){
                    floor = (await axios.get(`https://eth-mainnet.g.alchemy.com/nft/v2/${apiKey}/getFloorPrice?contractAddress=${c?.primary_asset_contracts[0]?.address}`))?.data?.openSea?.floorPrice
                }
                return {
                    key: c?.slug,
                    name: c?.name,
                    title: c?.name,
                    id: c?.slug,
                    slug: c?.slug,
                    contract: c?.primary_asset_contracts[0]?.address || c?.slug,
                    seven: c?.stats?.seven_day_volume
                    ? Math.floor(c.stats.seven_day_volume * 10000) / 10000
                    : 0,
                    thirty: c?.stats?.thirty_day_volume
                    ? Math.floor(c.stats.thirty_day_volume * 10000) / 10000
                    : 0,
                    one: c?.stats?.one_day_volume ? Math.floor(c.stats.one_day_volume * 10000) / 10000 : 0,
                    floor,
                    src: c?.image_url,
                    link: ''
                };
                },_data,30);
                resolve( vaultOpensea );
    })
        })
}

fs.readFile('./data/vault.txt', 'utf8', (err, file) => {
    const _infuraProvider = new ethers.ethers.EtherscanProvider(
        'goerli',
        'A7257M9X55EPEKRDUNV1Q4JH65YM7NKHIT'
      );
    const date = new Date();
    if(file == "done"){
        readFile(async (data) => {
            const FIVE_MIN = 5 * 60 * 1000;  
            if (date - new Date(data.lastUpdate) > FIVE_MIN) {
                fs.writeFile('./data/vault.txt', "running", async (file2) => {
                    try{
                        if (date - new Date(data.lastUpdate) > FIVE_MIN) {
                            const _dataa = await getOpenseaCollections(0);
                            await updateSlugs(_dataa);
                            //const lastBlock = await _infuraProvider.getBlockNumber();
                            //const prices = await getPriceData(data.lastBlock, lastBlock);
                           
                            const alchemyCollections = await getAlchemyCollections(_dataa,[],0)

                            const _data = {
                                lastUpdate: date.toISOString(),
                                collections: alchemyCollections,
                            }
                            writeFile(JSON.stringify(_data, null, 2), () => {
                                fs.writeFile('./data/vault.txt', "done", async (file2) => {})
                            });
                        }
                    }
                    catch{
                        fs.writeFile('./data/vault.txt', "done", async (file2) => {})
                    }

                });
        
            }
        }, true);
    }
    
});
parentPort.postMessage("woo");


