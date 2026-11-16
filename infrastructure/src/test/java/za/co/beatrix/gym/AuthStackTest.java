package za.co.beatrix.gym;

import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import software.amazon.awscdk.assertions.Match;
import software.amazon.awscdk.assertions.Template;

class AuthStackTest {

    private final GymStacks stacks = TestStacks.create();
    private final Template template = Template.fromStack(stacks.auth());

    @Test
    void appClientIsCognitoOnlyCodeGrantWithSrpAndRefreshOnly() {
        template.hasResourceProperties(
                "AWS::Cognito::UserPoolClient",
                Match.objectLike(Map.of(
                        "SupportedIdentityProviders", List.of("COGNITO"),
                        "GenerateSecret", false,
                        "AllowedOAuthFlows", List.of("code"),
                        "ExplicitAuthFlows",
                        Match.arrayEquals(List.of("ALLOW_USER_SRP_AUTH", "ALLOW_REFRESH_TOKEN_AUTH")))));
        template.resourceCountIs("AWS::Cognito::UserPoolIdentityProvider", 0);
    }

    @Test
    void userPoolAllowsOnlyAdminCreatedEmailAccounts() {
        template.hasResourceProperties(
                "AWS::Cognito::UserPool",
                Match.objectLike(Map.of(
                        "AdminCreateUserConfig", Match.objectLike(Map.of("AllowAdminCreateUserOnly", true)),
                        "UsernameAttributes", List.of("email"))));
    }

    @Test
    void hasTerminationProtection() {
        assertTrue(stacks.auth().getTerminationProtection());
    }

    @Test
    void writesAuthParameters() {
        template.resourceCountIs("AWS::SSM::Parameter", 3);
        template.hasResourceProperties(
                "AWS::SSM::Parameter", Match.objectLike(Map.of("Name", "/gym/auth/user-pool-id")));
        template.hasResourceProperties(
                "AWS::SSM::Parameter", Match.objectLike(Map.of("Name", "/gym/auth/client-id")));
        template.hasResourceProperties(
                "AWS::SSM::Parameter",
                Match.objectLike(Map.of(
                        "Name", "/gym/auth/cognito-domain",
                        "Value", "gym-beatrix.auth.eu-west-1.amazoncognito.com")));
    }
}
