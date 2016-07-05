const exec = require('child_process').exec;
const express = require('express');
const request = require('request');
const path = require('path');
const app = express();
const AWS = require('aws-sdk');
const bodyParser = require('body-parser');
const parseTorrent = require('parse-torrent');

app.use(bodyParser.json()); // support json encoded bodies
app.use(bodyParser.urlencoded({
    extended: true
})); // support encoded bodies
app.set('view engine', 'html');
app.engine('html', require('hbs').__express);
app.use(express.static(__dirname + '/public'));

AWS.config.update({
    region: 'us-west-2',
    endpoint: 'http://localhost:8000'
});

const docClient = new AWS.DynamoDB.DocumentClient();


function youtubeDurationToSeconds(duration, display) {
    const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);

    const hours = (parseInt(match[1]) || 0);
    const minutes = (parseInt(match[2]) || 0);
    const seconds = (parseInt(match[3]) || 0);

    if (display) {
        if (hours) {
            return hours + ':' + minutes + ':' + seconds;
        } else {
            return minutes + ':' + seconds;
        }
    } else {
        if (hours) {
            return hours * 3600 + minutes * 60 + seconds;
        } else {
            return minutes * 60 + seconds;
        }
    }
}

function titleCase(str) {
    const inputStr = str.toLowerCase().split(' ');

    for (var i = 0; i < inputStr.length; i++) { // eslint-disable-line no-var
        inputStr[i] = inputStr[i].split('');
        inputStr[i][0] = inputStr[i][0].toUpperCase();
        inputStr[i] = inputStr[i].join('');
    }
    return inputStr.join(' '); //  converts the array of words back to a sentence.
}

app.get('/', function (req, res) {
    res.render(path.join(__dirname + '/index.html'));
});

app.get('/yt-stream/:url', function (req, res) {
    exec('killall livestreamer');

    exec('livestreamer --player=mplayer https://www.youtube.com/watch?v=' + req.params.url + ' best');

    const url = 'https://www.googleapis.com/youtube/v3/videos?part=snippet&key=AIzaSyDh3GVsn5LrRKMtU0tBPGK0_gfPRcDSlK4&id=' + req.params.url;
    const urlTime = 'https://www.googleapis.com/youtube/v3/videos?part=contentDetails&key=AIzaSyDh3GVsn5LrRKMtU0tBPGK0_gfPRcDSlK4&id=' + req.params.url;

    const urlTimeRequest = function () {
        return new Promise(function (resolve, reject) {
            request(urlTime, function (error, response, body) {
                if (!error && response.statusCode == 200) {
                    resolve(JSON.parse(body));
                } else {
                    reject(Error('urlTimeRequest broken' + error));
                }
            });
        });
    };

    const urlRequest = function (dataTime) {
        return new Promise(function (resolve, reject) {
            request(url, function (error, response, body) {
                if (!error && response.statusCode == 200) {
                    const data = JSON.parse(body);
                    res.render(path.join(__dirname + '/index.html'), {
                        title: data.items[0].snippet.title,
                        time: youtubeDurationToSeconds(dataTime.items[0].contentDetails.duration, true)
                    });
                    console.log('Playing Video');
                    resolve(youtubeDurationToSeconds(dataTime.items[0].contentDetails.duration, false));
                } else {
                    reject(Error('urlRequest broken' + error));
                }
            });
        });
    };

    urlTimeRequest().then(function (time) {
        return urlRequest(time);
    }).then(function (timeInterval) {
        setInterval(function () {
            exec('livestreamer --player=mplayer https://www.youtube.com/watch?v=' + req.params.url + ' best');
        }, timeInterval * 1000 + 1000);
    }).catch(function (error) {
        console.log('oh no', error);
    });
});

app.get('/twitch-stream/:url', function (req, res) {
    exec('killall livestreamer');
    res.render(path.join(__dirname + '/index.html'), {
        title: req.params.url + '\'s stream',
        time: undefined
    });
    exec('livestreamer --player=mplayer twitch.tv/' + req.params.url + ' best');
});

app.get('/movie-list', function (req, res) {
    exec('killall livestreamer');
    const scanTable = new Promise(function (resolve, reject) {
        docClient.scan({
            TableName: 'MovieList',
            Limit: 50
        }, function (err, data) {
            if (err) {
                console.error('Unable to scan the table. Error JSON:', JSON.stringify(err, null, 2));
            } else {
                // print all the movies
                console.log('Scan succeeded.');
                if (data) {
                    resolve(data);
                } else {
                    reject(Error('It broke'));
                }
            }
        });
    });
    scanTable.then(function (result) {
        res.render(path.join(__dirname + '/movie.html'), {
            item: result
        });
    }, function (err) {
        console.log(err); // Error: 'It broke'
    });
});

app.post('/movie-list', function (req, res) {
    if (req.body.post) {
        const movieNameArray = req.body.movie.split(' ').join('+');
        const urlOmdb = 'http://www.omdbapi.com/?t=' + movieNameArray + '&y=&plot=short&r=json&apikey=4545f38d';
        const urlRT = 'http://api.rottentomatoes.com/api/public/v1.0/movies.json?apikey=ny97sdcpqetasj8a4v2na8va&q=' + movieNameArray + '&page_limit=1';

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
                                year: parseInt(req.body.year) || parseInt(info.Year),
                                title: titleCase(req.body.movie),
                                url: req.body.url || 'No Url',
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
                    res.render(path.join(__dirname + '/500.html'), {
                        error: 'Are you sure this movie exists? Go back and double check the spelling!',
                        errorJSON: err,
                        code: '404'
                    });
                    console.error('Unable to add item. Error JSON:', JSON.stringify(err, null, 2));
                } else {
                    console.log('Added item:', JSON.stringify(data, null, 2));
                    res.redirect(req.get('referer'));
                }
            });
        }).catch(function (error) {
            console.log('oh no', error);
        });

        // torrent to ~/Downloads/
        exec('deluge-console ' + req.body.url);
    } else {
        // TODO Play the movie
    }
});

app.delete('/movie-list', function (req, res) { // eslint-disable-line no-unused-vars
    console.log('Attempting a delete...');

    docClient.delete({
        TableName: 'MovieList',
        Key: {
            year: parseInt(req.body.year),
            title: req.body.title
        }
    }, function (err, data) {
        if (err) {
            console.error('Unable to delete item. Error JSON:', JSON.stringify(err, null, 2));
        } else {
            console.log('DeleteItem succeeded:', JSON.stringify(data, null, 2));
            // res.redirect('/movie-list');
        }
    });

    // delete torrent
    exec('deluge-console rm --remove_data ' + parseTorrent(req.body.url).infoHash);
});

// Setup PiCAST Server
var srv = app.listen(3000, function () { // eslint-disable-line no-var
    const host = srv.address().address;
    const port = srv.address().port;

    console.log('Access at http://%s:%s', host, port);
});
