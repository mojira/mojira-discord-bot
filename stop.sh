# Send ^C to screen session window
screen -S discordbot-$1 -X stuff $'\003'
