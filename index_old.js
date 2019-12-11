/*
This is the OLD version of the bot.
The new version is located in `index.ts`.
*/

// Init Discord
const Discord = require( 'discord.js' );
const client = new Discord.Client();

// Setup request
const request = require( 'request' ).defaults( {
	headers: {
		'User-Agent': 'MojiraBot/0.0.1 (Discord; mojira-discord-bot)',
	},
} );

// Setup moment
const moment = require( 'moment' );

// Setup emoji-regex
const emojiRegex = require( 'emoji-regex/text.js' );

// Load settings
const settings = require( './settings.json' );

const projects = ['MC', 'MCL', 'MCPE', 'MCCE', 'MCE', 'WEB'];

let rolesMessage = '';

function reactToMessage( message, reactions ) {
	if ( !reactions.length ) return;
	message.react( reactions.shift() ).then(
		() => reactToMessage( message, reactions ),
	).catch(
		console.error,
	);
}

const roles = [
	{
		emoji: '648525192414494730',
		desc: 'Java Edition\n*PC, Mac and Linux*',
		id: '648536573675044865',
	},
	{
		emoji: '648474430158405642',
		desc: 'Bedrock Edition\n*Android, iOS, Windows 10, Xbox One and Nintendo Switch*',
		id: '648536590481752074',
	},
	{
		emoji: '648524067359686678',
		desc: 'Minecraft: Earth',
		id: '648536605094707201',
	},
	{
		emoji: '648521149390520320',
		desc: 'Other projects',
		id: '648536618113826847',
	},
];

function sendRolesMessage( channel, updateRolesMessage = false ) {
	const embed = new Discord.RichEmbed();
	embed.setTitle( 'Please select the project(s) you are interested in, so that we can add you to the appropriate channels.' )
		.setColor( 'AQUA' );

	for ( const role of roles ) {
		let emoji = client.emojis.get( role.emoji );
		if ( emoji == undefined ) emoji = '❓';
		else emoji = emoji.toString();

		embed.addField( emoji, role.desc );
	}

	channel.send( embed ).then(
		sentMessage => {
			reactToMessage( sentMessage, roles.map( role => role.emoji ) );
			if ( updateRolesMessage ) {
				rolesMessage = sentMessage.id;
			}
		},
	).catch( console.error );
}

function awaitReactions() {
	const rolesGuild = client.guilds.get( settings.roles_server );
	if ( !rolesGuild ) {
		console.error( 'Could not find roles server' );
		return;
	}
	const rolesChannel = rolesGuild.channels.get( settings.roles_channel );
	if ( !rolesChannel ) {
		console.error( 'Could not find roles channel' );
		return;
	}

	rolesChannel.bulkDelete( 1 );
	sendRolesMessage( rolesChannel, true );
}

client.once( 'ready', () => {
	console.log( 'Ready!' );

	const homeChannel = client.channels.find( channel => channel.id === settings.home_channel );
	homeChannel.send( 'Hey, I have been restarted!' );

	awaitReactions();
} );

// Stolen from Wiki-Bot
function sendPollMessage( message, title, options ) {
	const embed = new Discord.RichEmbed();
	embed.setTitle( 'Poll' )
		.setFooter( message.author.tag, message.author.avatarURL )
		.setTimestamp( message.createdAt )
		.setColor( 'GREEN' );

	if ( title ) {
		embed.setDescription( title );
	}

	if ( !options.length ) {
		options.push( {
			emoji: '👍',
			rawEmoji: '👍',
			text: 'Yes',
		} );
		options.push( {
			emoji: '👎',
			rawEmoji: '👎',
			text: 'No',
		} );
	}

	for ( const option of options ) {
		embed.addField( option.emoji, option.text, true );
	}

	message.channel.send( { embed: embed, disableEveryone: !message.member.hasPermission( 'MENTION_EVERYONE' ) } ).then(
		poll => {
			const reactions = options.map( option => option.rawEmoji );
			reactToMessage( poll, reactions );
		}, console.error,
	);
}

client.on( 'message', message => {
	if (
		// Don't reply to own messages
		message.author.id === client.user.id

		// Don't reply to non-default messages
		|| message.type !== 'DEFAULT'

		// Don't reply to webhooks
		|| message.webhookID
	) return;

	const user = message.author.tag;

	if ( message.content === '!ping' ) {
		console.log( `${ user } ran command !ping` );
		message.react( '🏓' );
		message.channel.send( 'Pong!' );

		return;
	}

	const versionRegex = /^!jira\s+version\s+(.+)$/;
	if ( versionRegex.test( message.content ) ) {
		const match = versionRegex.exec( message.content );
		const version = match[1];

		console.log( `${ user } ran command !jira version ${ version }` );

		message.channel.send( 'You want to learn more about version ' + version );

		return;
	}

	const rolesRegex = /^!jira roles$/;
	if ( rolesRegex.test( message.content ) ) {
		console.log( `User ${ user } ran command ${ message.content }` );

		sendRolesMessage( message.channel );

		if ( message.deletable ) {
			message.delete();
		}

		return;
	}

	const pollRegex = /^!jira\s+(?:vote|poll)(?:\s+(.*?))?\s*(?:\n|$)/;
	if ( pollRegex.test( message.content ) ) {
		console.log( `User ${ user } ran command ${ message.content }` );

		const polltitleMatch = pollRegex.exec( message.content );
		const polltitle = polltitleMatch ? polltitleMatch[1] : '';

		const commandContent = message.content.replace( pollRegex, '' );
		const commandArguments = commandContent.split( '\n' );

		const options = [];
		const optionRegex = /^\s*(\S+)\s+(.+)\s*$/;

		for ( const option of commandArguments ) {
			if ( !option.length ) continue;

			const optionArgs = optionRegex.exec( option );
			const customEmoji = /^<a?:(\w+):(\d+)>/;
			const unicodeEmoji = emojiRegex();

			if ( !optionArgs ) {
				message.channel.send( 'Error: Illegal argument supplied.' );
				return;
			}

			const emoji = optionArgs[1];
			if ( customEmoji.test( emoji ) || unicodeEmoji.test( emoji ) ) {
				let emojiName = emoji;
				let rawEmoji = emoji;
				const emojiMatch = customEmoji.exec( emoji );
				if ( emojiMatch ) {
					emojiName = emojiMatch[1];
					rawEmoji = emojiMatch[2];
				}
				options.push( {
					emoji: emoji,
					emojiName: emojiName,
					rawEmoji: rawEmoji,
					text: optionArgs[2],
				} );
			}
			else {
				message.channel.send( `Error: "${ optionArgs[1] }" is not an emoji.` );
				return;
			}
		}

		if ( message.deletable ) {
			message.delete();
		}

		sendPollMessage( message, polltitle, options );
	}

	const ticketRegex = RegExp( `(?:^|[^!])((${ projects.join( '|' ) })-\\d+)`, 'g' );
	const ticketMatches = message.content.matchAll( ticketRegex );

	const tickets = [];

	for ( const match of ticketMatches ) {
		tickets.push( {
			id: match[1],
			project: match[0],
		} );
	}

	// if (tickets.length > 5) {
	// 	message.react('⛔');
	// 	return;
	// }

	if ( tickets.length === 1 ) {
		const ticket = tickets[0];
		console.log( `User ${ user } mentioned Mojira ticket ${ ticket.id }` );

		request( {
			uri: 'https://bugs.mojang.com/rest/api/2/issue/' + encodeURIComponent( ticket.id ),
			json: true,
		}, ( error, response, body ) => {
			const link = 'https://bugs.mojang.com/browse/' + encodeURIComponent( ticket.id );

			if ( error ) {
				console.log( error );
				return;
			}

			if ( !response || !body ) {
				console.log( 'Error: No response' );
				return;
			}

			if ( response.statusCode !== 200 ) {
				console.log( `Error: Got status code ${ response.statusCode }` );
				return;
			}

			if ( body['status-code'] === 404 ) {
				console.log( `Error: Got status code ${ body['status-code'] }` );
				return;
			}

			if ( body.errorMessages ) {
				console.log( JSON.stringify( body.errorMessages ) );
				return;
			}

			if ( !body.fields ) {
				console.log( 'Error: no fields' );
				return;
			}

			let status = body.fields.status.name;
			let largeStatus = false;
			if ( body.fields.resolution ) {
				status = `Resolved as **${ body.fields.resolution.name }**`;

				if ( body.fields.resolution.id === '3' ) {
					const parents = body.fields.issuelinks
						.filter( relation => relation.type.id === '10102' && relation.outwardIssue )
						.map( relation => `\n→ **[${ relation.outwardIssue.key }](https://bugs.mojang.com/browse/${ relation.outwardIssue.key })** *(${ relation.outwardIssue.fields.summary })*` );

					status = 'Resolved as **Duplicate**' + parents.join( ',' );
					largeStatus = parents.length > 0;
				}
			}

			let description = body.fields.description;
			description = description.replace( /\s*\{panel[^}]+\}(?:.|\s)*?\{panel\}\s*/gi, '' );
			description = description.replace( /^\s*[\r\n]/gm, '\n' );
			description = description.split( '\n' ).slice( 0, 2 ).join( '\n' );

			const embed = new Discord.RichEmbed();
			embed.setAuthor( body.fields.reporter.displayName, body.fields.reporter.avatarUrls['48x48'], 'https://bugs.mojang.com/secure/ViewProfile.jspa?name=' + encodeURIComponent( body.fields.reporter.name ) )
				.setTitle( `[${ ticket.id }] ${ body.fields.summary }` )
				.setDescription( description.substring( 0, 2048 ) )
				.setURL( link )
				.addField( 'Status', status, !largeStatus )
				.setFooter( message.author.tag, message.author.avatarURL )
				.setTimestamp( message.createdAt )
				.setColor( 'RED' );

			function findThumbnail( attachments ) {
				const allowedMimes = [
					'image/png', 'image/jpeg',
				];

				for ( const attachment of attachments ) {
					if ( allowedMimes.includes( attachment.mimeType ) ) return attachment.content;
				}

				return undefined;
			}

			// Assigned to, Reported by, Created on, Category, Resolution, Resolved on, Since version, (Latest) affected version, Fixed version(s)

			const thumbnail = findThumbnail( body.fields.attachment );
			if ( thumbnail !== undefined ) embed.setImage( thumbnail );

			if ( body.fields.fixVersions && body.fields.fixVersions.length ) {
				const fixVersions = body.fields.fixVersions.map( v => v.name );
				embed.addField( 'Fix version' + ( fixVersions.length > 1 ? 's' : '' ), fixVersions.join( ', ' ), true );
			}

			if ( body.fields.votes.votes ) {
				embed.addField( 'Votes', body.fields.votes.votes, true );
			}

			if ( body.fields.comment.total ) {
				embed.addField( 'Comments', body.fields.comment.total, true );
			}

			const duplicates = body.fields.issuelinks.filter( relation => relation.type.id === '10102' && relation.inwardIssue );
			if ( duplicates.length ) {
				embed.addField( 'Duplicates', duplicates.length, true );
			}

			if ( body.fields.creator.key !== body.fields.reporter.key ) {
				embed.addField( 'Created by', `[${ body.fields.creator.displayName }](https://bugs.mojang.com/secure/ViewProfile.jspa?name=${ encodeURIComponent( body.fields.creator.name ) })`, true );
			}

			embed.addField( 'Created', moment( body.fields.created ).fromNow(), true );

			message.channel.send( '', embed );

			if ( message.content.match( new RegExp( `^\\s*${ ticket.id }\\s*$` ) ) ) {
				if ( message.deletable ) message.delete();
			}

			console.log( 'Success.' );
		} );
	}
	else if ( tickets.length > 1 ) {
		const ticketIds = tickets.map( ticket => ticket.id );
		console.log( `User ${ user } mentioned multiple Mojira tickets: ${ ticketIds.join( ', ' ) }` );

		const embed = new Discord.RichEmbed();
		embed.setTitle( 'Multiple tickets' )
			.setFooter( message.author.tag, message.author.avatarURL )
			.setTimestamp( message.createdAt )
			.setColor( 'RED' );

		const firstTicketIds = ticketIds.slice( 0, 10 + 1 );

		request( {
			uri: 'https://bugs.mojang.com/rest/api/2/search?jql=' + encodeURIComponent( `id IN (${ firstTicketIds.join( ',' ) }) ORDER BY key ASC` ),
			json: true,
		}, ( error, response, body ) => {
			if ( error ) {
				console.log( error );
				return;
			}

			if ( !response || !body ) {
				console.log( 'Error: No response' );
				return;
			}

			if ( response.statusCode !== 200 ) {
				console.log( `Error: Got status code ${ response.statusCode }` );
				return;
			}

			if ( body['status-code'] === 404 ) {
				console.log( `Error: Got status code ${ body['status-code'] }` );
				return;
			}

			if ( body.errorMessages ) {
				console.log( JSON.stringify( body.errorMessages ) );
				return;
			}

			if ( !body.issues ) {
				console.log( 'Error: no issues' );
				return;
			}

			for ( const issue of body.issues ) {
				embed.addField( issue.key, `[${ issue.fields.summary }](https://bugs.mojang.com/browse/${ issue.key })` );
			}

			if ( ticketIds.length !== firstTicketIds.length ) {
				embed.addField( 'More results', `[View all ${ ticketIds.length } tickets](https://bugs.mojang.com/issues/?jql=` + `id IN %28${ ticketIds.join( ',' ) }%29 ORDER BY key ASC`.replace( /\s+/ig, '%20' ) + ')' );
			}

			message.channel.send( '', embed );

			console.log( 'Success.' );
		} );
	}
} );

client.on( 'messageReactionAdd', ( messageReaction, user ) => {
	if ( messageReaction.message.id !== rolesMessage || user.id === client.user.id ) return;

	console.log( `User ${ user.tag } reacted to role message with ${ messageReaction.emoji.name }` );

	const role = roles.find( searchedRole => searchedRole.emoji === messageReaction.emoji.id );

	if ( !role ) {
		messageReaction.remove( user );
		return;
	}

	const member = messageReaction.message.guild.members.get( user.id );
	if ( member ) {
		member.addRole( role.id );
	}
} );

client.on( 'messageReactionRemove', ( messageReaction, user ) => {
	if ( messageReaction.message.id !== rolesMessage || user.id === client.user.id ) return;

	console.log( `User ${ user.tag } removed reaction ${ messageReaction.emoji.name } from role message` );

	const role = roles.find( searchedRole => searchedRole.emoji === messageReaction.emoji.id );

	if ( !role ) return;

	const member = messageReaction.message.guild.members.get( user.id );
	if ( member ) {
		member.removeRole( role.id );
	}
} );

client.login( settings.token );
console.log( 'Logging in...' );