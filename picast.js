var sys = require('sys');
var exec = require('child_process').exec;
var express = require('express');
var request = require('request');
var path = require('path');
// require('handlebars');
var $ = require('jquery');
var app = express();

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
                    setInterval(function(){
                        exec("livestreamer --player=mplayer https://www.youtube.com/watch?v=" + req.params.url + " best");
                      }
                    , timeInterval*1000 + 1000);
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
    res.render(path.join(__dirname + '/movie.html'), {
        'title': "test"
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

  if(display){
    if(hours) {
      return hours + ":" + minutes + ":" + seconds;
    } else {
      return minutes + ":" + seconds;
    }
  } else {
    if(hours) {
      return hours*3600 + minutes*60 + seconds;
    } else {
      return minutes*60 + seconds;
    }
  }
}
