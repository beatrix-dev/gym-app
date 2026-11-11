package za.co.beatrix.gym;

import java.util.List;
import software.amazon.awscdk.Duration;
import software.amazon.awscdk.RemovalPolicy;
import software.amazon.awscdk.SecretValue;
import software.amazon.awscdk.services.cognito.AttributeMapping;
import software.amazon.awscdk.services.cognito.CfnUserPoolClient;
import software.amazon.awscdk.services.cognito.CognitoDomainOptions;
import software.amazon.awscdk.services.cognito.OAuthFlows;
import software.amazon.awscdk.services.cognito.OAuthScope;
import software.amazon.awscdk.services.cognito.OAuthSettings;
import software.amazon.awscdk.services.cognito.ProviderAttribute;
import software.amazon.awscdk.services.cognito.UserPool;
import software.amazon.awscdk.services.cognito.UserPoolClient;
import software.amazon.awscdk.services.cognito.UserPoolClientIdentityProvider;
import software.amazon.awscdk.services.cognito.UserPoolDomain;
import software.amazon.awscdk.services.cognito.UserPoolDomainOptions;
import software.amazon.awscdk.services.cognito.UserPoolIdentityProviderGoogle;
import software.constructs.Construct;

/**
 * Cognito user pool where Google is the only way in. Self sign-up is enabled explicitly (CDK defaults it to off,
 * i.e. AllowAdminCreateUserOnly) because the AWS docs do not confirm that a first-time federated Google sign-in
 * works when it is off, and a wrong guess would lock the owner out. Natively signed-up users cannot get tokens:
 * the app client allows only refresh-token auth and only the Google IdP, and the backend rejects tokens without
 * a Google identity and enforces the email allowlist.
 */
public class Auth extends Construct {

    static final String GOOGLE_SECRET_NAME = "gym-app/google-oauth-client-secret";

    private final UserPool userPool;
    private final UserPoolClient client;
    private final UserPoolDomain domain;

    public Auth(Construct scope, String id, AuthProps props) {
        super(scope, id);

        this.userPool = UserPool.Builder.create(this, "UserPool")
                .selfSignUpEnabled(true)
                .removalPolicy(RemovalPolicy.RETAIN)
                .build();

        UserPoolIdentityProviderGoogle google = UserPoolIdentityProviderGoogle.Builder.create(this, "Google")
                .userPool(userPool)
                .clientId(props.googleClientId())
                .clientSecretValue(SecretValue.secretsManager(GOOGLE_SECRET_NAME))
                .scopes(List.of("openid", "email", "profile"))
                .attributeMapping(AttributeMapping.builder()
                        .email(ProviderAttribute.GOOGLE_EMAIL)
                        .fullname(ProviderAttribute.GOOGLE_NAME)
                        .build())
                .build();

        this.client = UserPoolClient.Builder.create(this, "Client")
                .userPool(userPool)
                .generateSecret(false)
                .supportedIdentityProviders(List.of(UserPoolClientIdentityProvider.GOOGLE))
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
        client.getNode().addDependency(google);
        // The L2 emits no ExplicitAuthFlows when every flow is off, and CloudFormation's default then allows SRP
        // and custom auth. Pin refresh-token-only explicitly.
        ((CfnUserPoolClient) client.getNode().getDefaultChild())
                .addPropertyOverride("ExplicitAuthFlows", List.of("ALLOW_REFRESH_TOKEN_AUTH"));

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
