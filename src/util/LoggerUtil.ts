export class LoggerUtil {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	public static shortenJiraError( error: any ): string {
		return `Information:
		  Status code: ${ error?.response?.status }
		  Status text: ${ error?.response?.statusText }
		  Error message(s): ${ error?.response?.data?.errorMessages }`.replace( /\t/g, '' );
	}
}