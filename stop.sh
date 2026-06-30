# Make it so the default deployment is "main"
DEPLOYMENT=${1:-main}
# Send ^C to screen session window
screen -S discordbot-$DEPLOYMENT -X stuff $'\003'
