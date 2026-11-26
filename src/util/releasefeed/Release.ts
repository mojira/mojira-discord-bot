export interface Release {
	id: string;
	createPost: () => Promise<string>;
}
