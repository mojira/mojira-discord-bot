export default abstract class Task {
	public abstract async run(): Promise<void>;
}
