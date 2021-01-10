# Start a screen called "mojiradiscordbot-<deployment>" with the node process
/usr/bin/screen -S mojiradiscordbot-$1 -d -m bash -c "NODE_ENV=$1 node bin" ; exit