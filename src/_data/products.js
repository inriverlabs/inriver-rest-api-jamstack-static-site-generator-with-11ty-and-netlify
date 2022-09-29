require('dotenv').config();
const axios = require("axios");
const { PromisePool } = require('@supercharge/promise-pool')

const language = process.env.INRIVER_API_LANGUAGE;
const apikey = process.env.INRIVER_API_KEY;
const apiurl = process.env.INRIVER_API_URL;
const inriverchannelId = process.env.INRIVER_CHANNEL_ID;

async function getChannelEntityList(channelId){
    const result = await axios.get(`${apiurl}/api/v1.0.0/channels/${channelId}/entitylist?entityTypeId=Product`, {
        headers: {
            'Accept': 'application/json',
            'X-inRiver-APIKey': apikey,
            'Accept-Language': language
        }
    });

    return result.data;
}

async function getEntityData(entityIdArr){
    const result = await axios({
        method: 'POST',
        url: `${apiurl}/api/v1.0.0/entities:fetchdata`,
        data: {
            "entityIds": entityIdArr,
            "objects": "EntitySummary, FieldsSummary"
        },
        headers: {
            'Accept': 'application/json',
            'X-inRiver-APIKey': apikey,
            'Accept-Language': language
        }
    });
    
    return result.data
}

async function getData (channelId) {
    let chunkSize = 999 // 999 items per data chunk
    let entityList = await getChannelEntityList(channelId); // returns 310 entity ids
    let result = []
    if( entityList && Object.keys(entityList).includes('entityIds') ){
        if(entityList.entityIds.length > chunkSize){
            let entityIdArray = entityList.entityIds;
            let chunksArr = [];
            while(true){
                remainingIdArr = entityIdArray.splice(chunkSize);
                chunksArr.push(entityIdArray);
                if(remainingIdArr.length > 0){
                    entityIdArray = remainingIdArr;
                }else{
                    break;
                }
            }

            await PromisePool
            // .withConcurrency(10)
            .for(chunksArr)
            .handleError(async (error, entityIdArray) => {
                console.log(error);
                console.log(entityIdArray);
            })
            .onTaskFinished((entityIdArray, pool) => {
                console.log(`Progress: ${pool.processedPercentage()}%`);
                console.log(`Active tasks: ${pool.activeTaskCount()}`);
                console.log(`Finished tasks: ${pool.processedCount()}`);
            })
            .process(async (entityIdArray, index, pool) => {
                console.log(index);
                const entityDataArray = await getEntityData(entityIdArray);
                entityDataArray.forEach(entityData => result.push(entityData));
            });

        }else{
            result = await getEntityData(entityList.entityIds);
        }
    }
    
    return result;
}

module.exports = async () => {
    let channelId = inriverchannelId; //17365;// 1327; // sample channelId
    let products = await getData(channelId);

    return products;
}