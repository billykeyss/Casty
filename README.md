# Casty (MICRO EDITION; STREAMING FIRST)
Casty is a fork off of the origianl PiCAST created by Lance Seidman

<b>GET/INSTALL PiCAST</b>

1). Download the setup.sh file and in a terminal (on your Pi) type: chmod +x setup.sh

2). After setup is done? Make sure it's running, in a browser visit: http://ip-to-your-Pi:3000.

Note: PiCAST uses Forever which means PiCAST runs forever, UNTIL the Pi Reboots.

3). Try streaming a Video (e.g. YouTube) by typing: http://ip-to-pi:3000/yt-stream/<YouTube Video ID>

That's it! We've made PiCAST as easy and small as possible using web technologies. This will run easy on
almost ANY Linux Distro as well that's Debian based or modify to run on RHEL/CENT.

<b>PiCAST COMMANDS (CURRENT)</b>

Start PiCAST: sh /path-to/PiCAST/picast_start.sh

Stop PiCAST: sh /path-to/PiCAST/picast_stop.sh

BROWSER REQUESTS

Stream YouTube Video: http://pi-ip:3000/yt-stream/video-id
Stream Twitch: http://pi-ip:3000/yt-stream/channel-name


Copy the mplayerConfig.txt file to your mplayer config file on your local machine
