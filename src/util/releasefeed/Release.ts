export interface Release {
	id: string;
	createPost: () => Promise<Post>;
}

export interface Post {
	content: string;
	// Java version whose videos are linked once they're out
	version?: string;
}
