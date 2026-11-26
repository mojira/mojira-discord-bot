export interface Release {
	id: string;
	createPost: () => Promise<Post>;
}

export interface Post {
	author: string;
	heading: string;
	intro: string;
	changelog: string;
	wiki: string;
	// Java version whose videos are linked once they're out
	version?: string;
	// Changelog article whose hero image is added once it's out
	article?: string;
}
