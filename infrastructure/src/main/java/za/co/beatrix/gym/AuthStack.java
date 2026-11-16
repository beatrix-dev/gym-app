package za.co.beatrix.gym;

import software.amazon.awscdk.Stack;
import software.amazon.awscdk.StackProps;
import software.amazon.awscdk.services.ssm.StringParameter;
import software.constructs.Construct;

/**
 * The Cognito user pool, which is also the list of who may use the app. Holds state, so the stack has termination
 * protection (set in {@link GymStacks}). Publishes the values the frontend release writes into config.json.
 */
public class AuthStack extends Stack {

    static final String COGNITO_DOMAIN_PREFIX = "gym-beatrix";
    static final String COGNITO_DOMAIN = COGNITO_DOMAIN_PREFIX + ".auth." + GymApp.REGION + ".amazoncognito.com";

    private final Auth auth;

    public AuthStack(Construct scope, String id, StackProps props) {
        super(scope, id, props);
        this.auth = new Auth(this, "Auth", new AuthProps(COGNITO_DOMAIN_PREFIX));

        parameter("UserPoolIdParameter", SsmNames.USER_POOL_ID, auth.getUserPool().getUserPoolId());
        parameter("ClientIdParameter", SsmNames.CLIENT_ID, auth.getClient().getUserPoolClientId());
        parameter("CognitoDomainParameter", SsmNames.COGNITO_DOMAIN, COGNITO_DOMAIN);
    }

    public Auth getAuth() {
        return auth;
    }

    private void parameter(String id, String name, String value) {
        StringParameter.Builder.create(this, id).parameterName(name).stringValue(value).build();
    }
}
