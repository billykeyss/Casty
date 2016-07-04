var sys = require('sys');
var exec = require('child_process').exec;
var express = require('express');
var request = require('request');
var path = require('path');
var $ = require('jquery');
var app = express();
var AWS = require("aws-sdk");
var bodyParser = require('body-parser');
var parseTorrent = require('parse-torrent');

app.use(bodyParser.json()); // support json encoded bodies
app.use(bodyParser.urlencoded({
    extended: true
})); // support encoded bodies

AWS.config.update({
    region: "us-west-2",
    endpoint: "http://localhost:8000"
});

var docClient = new AWS.DynamoDB.DocumentClient()

app.set('view engine', 'html');
app.engine('html', require('hbs').__express);
app.use(express.static(__dirname + '/public'));

app.get('/', function(req, res) {
    res.render(path.join(__dirname + '/index.html'));
});

app.get('/yt-stream/:url', function(req, res) {
    exec("killall livestreamer");

    exec("livestreamer --player=mplayer https://www.youtube.com/watch?v=" + req.params.url + " best");


    var url = "https://www.googleapis.com/youtube/v3/videos?part=snippet&key=AIzaSyDh3GVsn5LrRKMtU0tBPGK0_gfPRcDSlK4&id=" + req.params.url;
    var urlTime = "https://www.googleapis.com/youtube/v3/videos?part=contentDetails&key=AIzaSyDh3GVsn5LrRKMtU0tBPGK0_gfPRcDSlK4&id=" + req.params.url;

    var promise1 = function() {
        return new Promise(function(resolve, reject) {
            request(urlTime, function(error, response, body) {
                if (!error && response.statusCode == 200) {
                    var dataTime = JSON.parse(body);
                    resolve(dataTime);
                }
            })
        })
    };

    var promise2 = function(dataTime) {
        return new Promise(function(resolve, reject) {
            request(url, function(error, response, body) {
                var time = YTDurationToSeconds(dataTime.items[0].contentDetails.duration, true);
                if (!error && response.statusCode == 200) {
                    var data = JSON.parse(body);
                    res.render(path.join(__dirname + '/index.html'), {
                        'title': data.items[0].snippet.title,
                        'time': time
                    });
                    var timeInterval = (YTDurationToSeconds(dataTime.items[0].contentDetails.duration, false));
                    console.log("Playing Video");
                    resolve(timeInterval);
                }
            })
        })
    };

    promise1().then(function(time) {
        return promise2(time);
    }).then(function(timeInterval) {
        setInterval(function() {
            exec("livestreamer --player=mplayer https://www.youtube.com/watch?v=" + req.params.url + " best");
        }, timeInterval * 1000 + 1000);
    }).catch(function(error) {
        console.log('oh no', error);
    });
});

app.get('/twitch-stream/:url', function(req, res) {
    exec("killall livestreamer");
    res.render(path.join(__dirname + '/index.html'), {
        'title': req.params.url + '\'s stream',
        'time': undefined
    });
    exec("livestreamer --player=mplayer twitch.tv/" + req.params.url + " best");
});

app.get('/movie-list', function(req, res) {
    exec("killall livestreamer");
    var promise = new Promise(function(resolve, reject) {
        var movieData;
        docClient.scan({
            TableName: "MovieList",
            Limit: 50
        }, function(err, data) {
            if (err) {
                console.error("Unable to scan the table. Error JSON:", JSON.stringify(err, null, 2));
            } else {
                // print all the movies
                console.log("Scan succeeded.");
                movieData = data;
                if (movieData) {
                    resolve(movieData);
                } else {
                    reject(Error("It broke"));
                }
            }

        });
    });

    promise.then(function(result) {
        res.render(path.join(__dirname + '/movie.html'), {
            'item': result
        });
    }, function(err) {
        console.log(err); // Error: "It broke"
    });
});

app.post('/movie-list', function(req, res) {
    if(req.body.post) {
        var docClient = new AWS.DynamoDB.DocumentClient();
        var movieNameArray = req.body.movie.split(" ");
        movieNameArray = movieNameArray.join("+");
        var urlOmdb = "http://www.omdbapi.com/?t=" + movieNameArray + "&y=&plot=short&r=json&apikey=4545f38d";
        var url_rt = "http://api.rottentomatoes.com/api/public/v1.0/movies.json?apikey=ny97sdcpqetasj8a4v2na8va&q=" + movieNameArray + "&page_limit=1";

        var imdbPromise = function() {
            return new Promise(function(resolve, reject) {
                request(urlOmdb, function(error, response, body) {
                    if (!error && response.statusCode == 200) {
                        var info = JSON.parse(body);
                        resolve(info);
                    } else {
                        reject(Error("It broke"));
                    }
                })
            })
        };

        var RTPromise = function(info) {
            return new Promise(function(resolve, reject) {
                request(url_rt, function(error, response, body) {
                    if (!error && response.statusCode == 200) {
                        var info_rt = JSON.parse(body).movies[0];
                        var info_rt_db;
                        if(info_rt) {
                            info_rt_db = {
                                "runtime": info_rt.runtime,
                                "rating": info_rt.ratings.critics_score
                            }
                        } else {
                            info_rt_db = {};
                        }

                        var paramsAdd = {
                            TableName: "MovieList",
                            Item: {
                                "year": parseInt(req.body.year) || parseInt(info.Year),
                                "title": titleCase(req.body.movie),
                                "url": req.body.url || "No Url",
                                "info": info,
                                "infoRT": info_rt_db
                            }
                        };
                        resolve(paramsAdd);
                    } else {
                        reject(Error("It broke"));
                    }
                })
            })
        };

        imdbPromise().then(function(info) {
            return RTPromise(info);
        }).then(function(paramsAdd) {
            var url_poster = "http://img.omdbapi.com/?i=" + paramsAdd.Item.info.imdbID + "&apikey=4545f38d";
            paramsAdd.Item.poster = url_poster;
            docClient.put(paramsAdd, function(err, data) {
                if (err) {
                    res.render(path.join(__dirname + '/500.html'), {
                        'error': "Are you sure this movie exists? Go back and double check the spelling!",
                        'errorJSON': err,
                        'code': "404"
                    });
                    console.error("Unable to add item. Error JSON:", JSON.stringify(err, null, 2));
                } else {
                    console.log("Added item:", JSON.stringify(data, null, 2));
                    res.redirect(req.get('referer'));
                }
            });
        }).catch(function(error) {
            console.log('oh no', error);
        });

        // torrent to ~/Downloads/
        exec("deluge-console " + req.body.url);
    } else {
        //TODO Play the movie
    }
});

app.delete('/movie-list', function(req, res) {
    console.log("Attempting a delete...");

    docClient.delete({
        TableName: "MovieList",
        Key: {
            "year": parseInt(req.body.year),
            "title": req.body.title
        }
    }, function(err, data) {
        if (err) {
            console.error("Unable to delete item. Error JSON:", JSON.stringify(err, null, 2));
        } else {
            console.log("DeleteItem succeeded:", JSON.stringify(data, null, 2));
            // res.redirect('/movie-list');
        }
    });

    // delete torrent
    exec("deluge-console rm --remove_data " + parseTorrent(req.body.url).infoHash);
});

// Setup PiCAST Server
var srv = app.listen(3000, function() {
    var host = srv.address().address;
    var port = srv.address().port;

    console.log('Access at http://%s:%s', host, port);
});

function YTDurationToSeconds(duration, display) {
    var match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/)

    var hours = (parseInt(match[1]) || 0);
    var minutes = (parseInt(match[2]) || 0);
    var seconds = (parseInt(match[3]) || 0);

    if (display) {
        if (hours) {
            return hours + ":" + minutes + ":" + seconds;
        } else {
            return minutes + ":" + seconds;
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
    str = str.toLowerCase().split(' '); // will split the string delimited by space into an array of words

    for (var i = 0; i < str.length; i++) { // str.length holds the number of occurrences of the array...
        str[i] = str[i].split(''); // splits the array occurrence into an array of letters
        str[i][0] = str[i][0].toUpperCase(); // converts the first occurrence of the array to uppercase
        str[i] = str[i].join(''); // converts the array of letters back into a word.
    }
    return str.join(' '); //  converts the array of words back to a sentence.
}
