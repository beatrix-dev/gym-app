package za.co.beatrix.gym;

import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import software.amazon.awscdk.App;
import software.amazon.awscdk.Environment;
import software.amazon.awscdk.StackProps;
import software.amazon.awscdk.assertions.Match;
import software.amazon.awscdk.assertions.Template;

class CiStackTest {

    private static final String ACCOUNT = "123456789012";

    private final Template template = Template.fromStack(new CiStack(
            new App(),
            "TestCi",
            StackProps.builder()
                    .env(Environment.builder().account(ACCOUNT).region("eu-west-1").build())
                    .build(),
            "beatrix-dev/gym-app"));

    @Test
    void registersGithubOidcProvider() {
        template.hasResourceProperties(
                "AWS::IAM::OIDCProvider",
                Map.of("Url", "https://token.actions.githubusercontent.com"));
    }

    @Test
    void roleTrustsOnlyMainBranchOfRepo() {
        Map<String, Object> conditions = Map.of(
                "token.actions.githubusercontent.com:sub", "repo:beatrix-dev/gym-app:ref:refs/heads/main",
                "token.actions.githubusercontent.com:aud", "sts.amazonaws.com");
        Map<String, Object> statement = Map.of(
                "Action", "sts:AssumeRoleWithWebIdentity",
                "Condition", Map.of("StringEquals", conditions));
        template.hasResourceProperties(
                "AWS::IAM::Role",
                Match.objectLike(Map.of(
                        "AssumeRolePolicyDocument",
                        Match.objectLike(Map.of("Statement", List.of(Match.objectLike(statement)))))));
    }

    @Test
    void roleMayOnlyAssumeCdkBootstrapRoles() {
        template.hasResourceProperties(
                "AWS::IAM::Policy",
                Match.objectLike(Map.of("PolicyDocument", Match.objectLike(Map.of(
                        "Statement", List.of(Map.of(
                                "Action", "sts:AssumeRole",
                                "Effect", "Allow",
                                "Resource", "arn:aws:iam::" + ACCOUNT + ":role/cdk-*")))))));
    }
}
