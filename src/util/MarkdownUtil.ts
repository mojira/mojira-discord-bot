export class MarkdownUtil {
	/**
	 * Converts JIRA markdown to Discord markdown + headings
	 * Partially adapted from https://github.com/kylefarris/J2M
	 *
	 * @param text The text that should be converted
	 */
	public static jira2md( text: string ): string {
		return text
			// Unordered lists
			.replace(
				/^[ \t]*(#+)\s+/gm,
				( _match, nums ) => Array( nums.length ).join( '    ' ) + '1. '
			)
			// Headers 1-6
			.replace(
				/^h([0-6])\.(.*)$/gm,
				( _match, level, content ) => Array( parseInt( level ) + 1 ).join( '#' ) + content
			)
			// Bold
			.replace( /\*(\S.*)\*/g, '**$1**' )
			// Italic
			.replace( /_(\S.*)_/g, '*$1*' )
			// Monospaced text
			.replace( /\{\{([^}]+)\}\}/g, '`$1`' )
			// Inserts / underline
			.replace( /\+([^+]*)\+/g, '__$1__' )
			// Remove superscript
			.replace( /\^([^^]*)\^/g, '$1' )
			// Remove subscript
			.replace( /~([^~]*)~/g, '$1' )
			// Strikethrough
			.replace( /(\s+)-(\S+.*?\S)-(\s+)/g, '$1~~$2~~$3' )
			// Code Block
			.replace( /\{code([^}]+)?\}[^]*\n?\{code\}/gm, '' )
			// Pre-formatted text
			.replace( /{noformat}/g, '```' )
			// Un-named Links
			.replace( /\[([^|]+?)\]/g, '$1' )
			// Remove images
			.replace( /!(.+)!/g, '' )
			// Named links
			.replace( /\[(.+?)\|(.+?)\]/g, '[$1]($2)' )
			// Single paragraph block quote
			.replace( /^bq\.\s+/gm, '> ' )
			// Block quote
			.replace( /\{quote\}\s*([\s\S]+)\{quote\}/, ( _match, quote ) => quote.replace( /^(.+)$/gm, '> $1\n' ) )
			// Remove color
			.replace( /\{color:[^}]+\}([^]*)\{color\}/gm, '$1' )
			// Remove panel
			.replace( /\{panel:title=([^}]*)\}\n?([^]*?)\n?\{panel\}/gm, '' )
			// Remove table header
			.replace( /^[ \t]*((\|\|[^|]+)+\|\|)[ \t]*$/gm, '' )
			// Remove table rows
			.replace( /^[ \t]*((\|[^|]+)+\|)[ \t]*$/gm, '' );
	}

	/**
	 * Escapes all meta characters supported by Discord's Markdown syntax.
	 *
	 * @param text The text that should be escaped
	 */
	public static escape( text: string ): string {
		return text.replace( /([*_`~|\\])/g, '\\$1' );
	}
}
