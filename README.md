# stream-server

you can stream things to it and it does fancy things like DASH

it makes zero sense for you to use this overengineered and
more or less hacked together pile of nginx configs and a few
express-powered Node.js apis. 

most of the crap in here is self-explanatory anyways, except for
the following:

* the specific nginx-rtmp module used is a fork of the original and
can be found here: <https://github.com/ut0mt8/nginx-rtmp-module/>
* stuff expects other stuff to be in `/var/www/live`
