package za.co.beatrix.gym;

import java.util.List;
import software.amazon.awscdk.Duration;
import software.amazon.awscdk.RemovalPolicy;
import software.amazon.awscdk.services.cognito.AccountRecovery;
import software.amazon.awscdk.services.cognito.AuthFlow;
import software.amazon.awscdk.services.cognito.CognitoDomainOptions;
import software.amazon.awscdk.services.cognito.OAuthFlows;
import software.amazon.awscdk.services.cognito.OAuthScope;
import software.amazon.awscdk.services.cognito.OAuthSettings;
import software.amazon.awscdk.services.cognito.SignInAliases;
import software.amazon.awscdk.services.cognito.UserPool;
import software.amazon.awscdk.services.cognito.UserPoolClient;
import software.amazon.awscdk.services.cognito.UserPoolClientIdentityProvider;
import software.amazon.awscdk.services.cognito.UserPoolDomain;
import software.amazon.awscdk.services.cognito.UserPoolDomainOptions;
import software.constructs.Construct;

/**
 * Cognito user pool with email + password accounts that only an administrator can create, so the pool itself is
 * the allowlist. Users sign in on the Cognito hosted login page; the app client allows SRP (the password never
 * leaves the browser) and refresh tokens only.
 */
public class Auth extends Construct {

    private final UserPool userPool;
    private final UserPoolClient client;
    private final UserPoolDomain domain;

    public Auth(Construct scope, String id, AuthProps props) {
        super(scope, id);

        this.userPool = UserPool.Builder.create(this, "UserPool")
                .selfSignUpEnabled(false)
                .signInAliases(SignInAliases.builder().email(true).build())
                .accountRecovery(AccountRecovery.EMAIL_ONLY)
                .removalPolicy(RemovalPolicy.RETAIN)
                .build();

        this.client = UserPoolClient.Builder.create(this, "Client")
                .userPool(userPool)
                .generateSecret(false)
                .supportedIdentityProviders(List.of(UserPoolClientIdentityProvider.COGNITO))
                .authFlows(AuthFlow.builder().userSrp(true).build())
                .oAuth(OAuthSettings.builder()
                        .flows(OAuthFlows.builder().authorizationCodeGrant(true).build())
                        .scopes(List.of(OAuthScope.OPENID, OAuthScope.EMAIL, OAuthScope.PROFILE))
                        .callbackUrls(List.of(
                                "https://app.beatrix.co.za/auth/callback", "http://localhost:5173/auth/callback"))
                        .logoutUrls(List.of("https://app.beatrix.co.za/", "http://localhost:5173/"))
                        .build())
                .idTokenValidity(Duration.hours(1))
                .refreshTokenValidity(Duration.days(30))
                .build();

        this.domain = userPool.addDomain(
                "Domain",
                UserPoolDomainOptions.builder()
                        .cognitoDomain(CognitoDomainOptions.builder()
                                .domainPrefix(props.domainName())
                                .build())
                        .build());
    }

    public UserPool getUserPool() {
        return userPool;
    }

    public UserPoolClient getClient() {
        return client;
    }

    public UserPoolDomain getDomain() {
        return domain;
    }
}
