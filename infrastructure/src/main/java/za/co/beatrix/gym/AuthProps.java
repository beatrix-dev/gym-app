package za.co.beatrix.gym;

/** @param domainName Cognito hosted-UI domain prefix */
public record AuthProps(String domainName, String googleClientId) {}
