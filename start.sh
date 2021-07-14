# Make it so the default deployment is "main"
DEPLOYMENT=${1:-main}
# Start a screen called "mojiradiscordbot-<deployment>" with the node process
/usr/bin/screen -S mojiradiscordbot-$DEPLOYMENT -d -m bash -c "NODE_ENV=$DEPLOYMENT node bin" ; exit
