const AWS = require('aws-sdk');
const request = require('request');

AWS.config.update({
    region: 'us-west-2',
    endpoint: 'http://localhost:8000'
});

const docClient = new AWS.DynamoDB.DocumentClient();

const year = 2016;
const title = 'Marauders';
const url = 'magnet:?xt=urn:btih:177dc7a0c1a23f0a86c7bbde6cd95f6a65998dff&dn=Marauders.2016.HDRip.XViD-ETRG&tr=udp%3A%2F%2Ftracker.openbittorrent.com%3A80&tr=udp%3A%2F%2Fopen.demonii.com%3A1337&tr=udp%3A%2F%2Ftracker.coppersurfer.tk%3A6969&tr=udp%3A%2F%2Fexodus.desync.com%3A6969';

const urlOmdb = 'http://www.omdbapi.com/?t=' + title + '&y=&plot=short&r=json&apikey=4545f38d';
const urlRT = 'http://api.rottentomatoes.com/api/public/v1.0/movies.json?apikey=ny97sdcpqetasj8a4v2na8va&q=' + title + '&page_limit=1';

const imdbRequest = function () {
    return new Promise(function (resolve, reject) {
        request(urlOmdb, function (error, response, body) {
            if (!error && response.statusCode == 200) {
                resolve(JSON.parse(body));
            } else {
                reject(Error('It broke'));
            }
        });
    });
};

const rtRequest = function (info) {
    return new Promise(function (resolve, reject) {
        request(urlRT, function (error, response, body) {
            if (!error && response.statusCode == 200) {
                const infoRT = JSON.parse(body).movies[0];
                var infoRTData = {}; // eslint-disable-line no-var
                if (infoRT) {
                    infoRTData = {
                        runtime: infoRT.runtime,
                        rating: infoRT.ratings.critics_score
                    };
                }

                var paramsAdd = { // eslint-disable-line no-var
                    TableName: 'MovieList',
                    Item: {
                        year: year,
                        title: title,
                        url: url,
                        info: info,
                        infoRT: infoRTData
                    }
                };
                resolve(paramsAdd);
            } else {
                reject(Error('It broke'));
            }
        });
    });
};

imdbRequest().then(function (info) {
    return rtRequest(info);
}).then(function (paramsAdd) {
    const putParams = paramsAdd;
    putParams.Item.poster = 'http://img.omdbapi.com/?i=' + paramsAdd.Item.info.imdbID + '&apikey=4545f38d';
    docClient.put(putParams, function (err, data) {
        if (err) {
            console.error('Unable to add item. Error JSON:', JSON.stringify(err, null, 2));
        } else {
            console.log('Added item:', JSON.stringify(data, null, 2));
        }
    });
}).catch(function (error) {
    console.log('oh no', error);
});

console.log('Adding a new item...');
