import jpeg from 'jpeg-js';

export class AccentColor {
	private static readonly clusters = 5;
	private static readonly iterations = 10;
	private static readonly samples = 4096;
	private static readonly lightness = 0.6;
	private static readonly minSaturation = 0.45;
	private static readonly maxSaturation = 0.85;
	private static readonly greySaturation = 0.08;

	/**
	 * Pastel version of centre of largest group of similar pixels in JPEG image, found by k-means clustering
	 */
	public static fromImage( image: Buffer ): number | undefined {
		if ( image[0] !== 0xFF || image[1] !== 0xD8 ) return undefined;

		const { data } = jpeg.decode( image, { useTArray: true, formatAsRGBA: false } );
		const step = Math.max( 1, Math.floor( data.length / 3 / this.samples ) ) * 3;
		const pixels: number[][] = [];
		for ( let index = 0; index < data.length; index += step ) {
			pixels.push( [ data[index], data[index + 1], data[index + 2] ] );
		}

		const distance = ( a: number[], b: number[] ) => ( a[0] - b[0] ) ** 2 + ( a[1] - b[1] ) ** 2 + ( a[2] - b[2] ) ** 2;
		const nearest = ( pixel: number[], centers: number[][] ) => centers.reduce( ( best, center, index ) => distance( pixel, center ) < distance( pixel, centers[best] ) ? index : best, 0 );

		// Seeds each further centre with pixel farthest from existing ones
		let centers = [ pixels[0] ];
		while ( centers.length < this.clusters ) {
			centers.push( pixels.reduce( ( farthest, pixel ) => distance( pixel, centers[nearest( pixel, centers )] ) > distance( farthest, centers[nearest( farthest, centers )] ) ? pixel : farthest ) );
		}

		let sizes: number[] = [];
		for ( let iteration = 0; iteration < this.iterations; iteration++ ) {
			const sums = centers.map( () => [ 0, 0, 0 ] );
			sizes = centers.map( () => 0 );
			for ( const pixel of pixels ) {
				const cluster = nearest( pixel, centers );
				sums[cluster] = sums[cluster].map( ( sum, channel ) => sum + pixel[channel] );
				sizes[cluster]++;
			}
			centers = centers.map( ( center, cluster ) => sizes[cluster] > 0 ? sums[cluster].map( sum => sum / sizes[cluster] ) : center );
		}

		return this.toPastel( centers[sizes.indexOf( Math.max( ...sizes ) )] );
	}

	/**
	 * Color with same hue, fixed lightness and saturation within bounds, keeping greys grey
	 */
	private static toPastel( color: number[] ): number {
		const [ red, green, blue ] = color.map( channel => channel / 255 );
		const max = Math.max( red, green, blue );
		const min = Math.min( red, green, blue );
		const chroma = max - min;
		const hue = chroma === 0 ? 0
			: max === red ? 60 * ( ( ( green - blue ) / chroma + 6 ) % 6 )
				: max === green ? 60 * ( ( blue - red ) / chroma + 2 )
					: 60 * ( ( red - green ) / chroma + 4 );
		const original = chroma === 0 ? 0 : chroma / ( 1 - Math.abs( max + min - 1 ) );
		const saturation = original < this.greySaturation ? 0 : Math.min( this.maxSaturation, Math.max( this.minSaturation, original ) );

		// Standard HSL to RGB conversion
		const amount = saturation * Math.min( this.lightness, 1 - this.lightness );
		const channel = ( offset: number ) => {
			const position = ( offset + hue / 30 ) % 12;
			return Math.round( 255 * ( this.lightness - amount * Math.max( -1, Math.min( position - 3, 9 - position, 1 ) ) ) );
		};
		return ( channel( 0 ) << 16 ) + ( channel( 8 ) << 8 ) + channel( 4 );
	}
}
