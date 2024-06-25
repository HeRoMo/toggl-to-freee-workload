// type definitions of googleworkspace/apps-script-oauth2
// see: https://github.com/googleworkspace/apps-script-oauth2
declare namespace OAuth2 {
  function createService(serviceName: string): Service;
  interface Service {
    setAuthorizationBaseUrl(baseUrl: string): this;
    setTokenUrl(tokenUrl: string): this;
    setClientId(clientId: string): this;
    setClientSecret(clientSecret: string):this;
    setCallbackFunction(funcName: string):this;
    setPropertyStore(props: GoogleAppsScript.Properties.Properties):this;
    setCache(cache: GoogleAppsScript.Cache.Cache): this;
    handleCallback(callbackRequest: object): boolean;
    reset(): void;
    getAccessToken(): object;
    hasAccess(): boolean;
    getAuthorizationUrl(): string;
  }
}
