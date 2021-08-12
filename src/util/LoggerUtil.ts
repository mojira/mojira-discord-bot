export class LoggerUtil {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	public static shortenJiraError( error: any ): string {
		return `Information:
		  Status code: ${ error.response?.status || undefined }
		  Status text: ${ error.response?.statusText || undefined }
		  Error message(s): ${ error.response?.data.errorMessages || undefined }`.replace( /\t/g, '' );
	}
}