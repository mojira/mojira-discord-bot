export default abstract class Task {
	public abstract run(): Promise<void>;
}
