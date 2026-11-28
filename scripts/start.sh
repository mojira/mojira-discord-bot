# Make it so the default deployment is "main"
DEPLOYMENT=${1:-main}
# Start a screen called "discordbot-<deployment>" with the node process
/usr/bin/screen -LdmS discordbot-$DEPLOYMENT bash -c "NODE_ENV=$DEPLOYMENT node bin" ; exit
