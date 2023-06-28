import globalClassNames from '..\fbasestyle.d';
declare const classNames: typeof globalClassNames & {
    readonly google: 'google';
    readonly facebook: 'facebook';
    readonly yahoo: 'yahoo';
    readonly microsoft: 'microsoft';
    readonly phone: 'phone';
    readonly password: 'password';
    readonly twitter: 'twitter';
    readonly github: 'github';
    readonly apple: 'apple';
    readonly anonymous: 'anonymous';
    readonly telegram: 'telegram';
};
export = classNames;
