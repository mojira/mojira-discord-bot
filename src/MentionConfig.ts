import { ColorResolvable } from 'discord.js';
import BotConfig from './BotConfig';

export interface FieldConfig {
	type: FieldType;
	label: string;
	path?: string;
	inline?: boolean;
	innerPath?: string;
}

export enum FieldType {
	Status, LargeStatus, Field, User, JoinedArray, ArrayCount, DuplicateCount, Date, FromNow
}

export interface Description {
	maxCharacters: number;
	maxLineBreaks?: number;
	exclude?: RegExp[];
}

export class EmbedConfig {
	public title: boolean;
	public description: boolean | Description;
	public author: boolean;
	public url: boolean;
	public thumbnail: boolean;
	public color: ColorResolvable;
	public fields: false | FieldConfig[];

	constructor( json ) {
		this.title = !!json.title;
		if ( typeof json.description === 'object' ) {
			this.description = { maxCharacters: 2048 };
			if( json.description.max_characters ) {
				if ( json.description.max_characters < 1 || json.description.max_characters > 2048 ) {
					throw `An embed type has a character limit of ${ json.description.max_characters } for the description, but value must be between 1 and 2048!`;
				}

				this.description.maxCharacters = json.description.max_characters;
			}
			if( json.description.max_line_breaks ) {
				this.description.maxLineBreaks = json.description.max_line_breaks;
			}
			if( json.description.exclude ) {
				this.description.exclude = json.description.exclude.map( v => {
					const components = v.split( '/' ) as Array<string>;
					if( components && components.length < 3 ) throw `Invalid regex: Not enough slashes (/) (expected: 2): ${ v }`;
					return new RegExp( components.splice( 1, components.length - 2 ).join( '/' ), components[ components.length - 1 ] );
				} );
			}
		} else {
			this.description = false;
		}

		this.author = !!json.author;
		this.url = !!json.url;
		this.thumbnail = !!json.thumbnail;

		if( !json.color ) throw 'An embed type has no color.';
		this.color = json.color as ColorResolvable;
		if( !this.color ) throw `An embed type has invalid color ${ json.color }.`;

		if ( json.fields instanceof Array ) {
			this.fields = new Array<FieldConfig>();

			for( const field of json.fields ) {
				if( !field.label ) throw 'An embed type contains a field object without any label.';
				if( !( field.type as string ) ) throw `An embed type contains field "${ field.label }" without any type.`;
				let type = field.type as string;

				// convert snake_case to PascalCase
				type = type.replace( /(?:^|_)./g, match => match.substring( match.length - 1, match.length ).toUpperCase() );

				const fieldType = FieldType[type];
				if( fieldType === undefined ) throw `An embed type contains field "${ field.label }" with invalid type "${ type }".`;

				if( ![ FieldType.Status, FieldType.LargeStatus, FieldType.DuplicateCount ].includes( fieldType ) && !field.path ) throw `An embed type contains field "${ field.label }" without any path.`;

				this.fields.push( {
					type: fieldType,
					label: field.label,
					path: field.path,
					inline: field.inline !== undefined ? field.inline : true,
					innerPath: field.innerPath,
				} );
			}
		} else {
			this.fields = false;
		}
	}
}

export default class MentionConfig {
	public requireUrl?: boolean;
	public forbidUrl?: boolean;
	public requiredPrefix?: string;
	public forbiddenPrefix?: string;
	public requiredKeyword?: string;
	public forbiddenKeyword?: string;
	public embed: EmbedConfig;

	constructor( json, embedTypes: Map<string, EmbedConfig> ) {
		if( !json.embed ) {
			this.embed = BotConfig.defaultEmbed;
		} else {
			this.embed = embedTypes.get( json.embed );
			if( !this.embed ) throw `Added mention type with unkown embed ${ json.embed }.`;
		}

		this.requireUrl = json.require_url;
		this.forbidUrl = json.forbid_url;
		this.requiredPrefix = json.required_prefix;
		this.forbiddenPrefix = json.forbidden_prefix;
		this.requiredKeyword = json.required_keyword;
		this.forbiddenKeyword = json.forbidden_keyword;
	}
}