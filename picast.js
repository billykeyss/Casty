var sys = require('sys');
var exec = require('child_process').exec;
var express = require('express');
var request = require('request');
var path = require('path');
var $ = require('jquery');
var app = express();
var AWS = require("aws-sdk");
var bodyParser = require('body-parser');

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
    request(urlTime, function(error, response, body) {
        if (!error && response.statusCode == 200) {
            var dataTime = JSON.parse(body);
            var time = YTDurationToSeconds(dataTime.items[0].contentDetails.duration, true);

            request(url, function(error, response, body) {
                if (!error && response.statusCode == 200) {
                    var data = JSON.parse(body);
                    res.render(path.join(__dirname + '/index.html'), {
                        'title': data.items[0].snippet.title,
                        'time': time
                    });
                    var timeInterval = (YTDurationToSeconds(dataTime.items[0].contentDetails.duration, false));
                    setInterval(function() {
                        exec("livestreamer --player=mplayer https://www.youtube.com/watch?v=" + req.params.url + " best");
                    }, timeInterval * 1000 + 1000);
                    console.log("Playing Video");
                }
            })
        }
    })


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
            Limit : 50
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
    var docClient = new AWS.DynamoDB.DocumentClient();

    var paramsAdd = {
        TableName: "MovieList",
        Item: {
            "year": parseInt(req.body.year),
            "title": req.body.movie,
            "url": req.body.url || "No Url"
        }
    };

    docClient.put(paramsAdd, function(err, data) {
        if (err) {
            console.error("Unable to add item. Error JSON:", JSON.stringify(err, null, 2));
        } else {
            console.log("Added item:", JSON.stringify(data, null, 2));
            res.redirect(req.get('referer'));
        }
    });
});

app.delete('/movie-list', function(req, res) {
    console.log("Attempting a delete...");

    docClient.delete({
        TableName: "MovieList",
        Key:{
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
