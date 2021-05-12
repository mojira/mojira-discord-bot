export class JiraUtil {
    public static getCurrentDateJql( date: Date ): string {
        return date.getFullYear() + '/' + date.getMonth() + '/' + date.getDay() + ' ' + date.getHours() + ':' + date.getMinutes();
    }
}