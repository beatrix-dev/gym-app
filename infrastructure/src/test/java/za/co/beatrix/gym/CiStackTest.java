package za.co.beatrix.gym;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import software.amazon.awscdk.App;
import software.amazon.awscdk.Environment;
import software.amazon.awscdk.StackProps;
import software.amazon.awscdk.assertions.Match;
import software.amazon.awscdk.assertions.Matcher;
import software.amazon.awscdk.assertions.Template;

class CiStackTest {

    private static final String ACCOUNT = "123456789012";
    private static final String GYM_PARAMETERS = "arn:aws:ssm:eu-west-1:" + ACCOUNT + ":parameter/gym/*";

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
    void hasThreeRolesWithFixedNames() {
        template.resourceCountIs("AWS::IAM::Role", 3);
        for (String name : List.of(CiStack.INFRA_ROLE, CiStack.BACKEND_RELEASE_ROLE, CiStack.FRONTEND_RELEASE_ROLE)) {
            template.hasResourceProperties("AWS::IAM::Role", Match.objectLike(Map.of("RoleName", name)));
        }
    }

    @Test
    void everyRoleTrustsOnlyMainBranchOfRepo() {
        Map<String, Object> conditions = Map.of(
                "token.actions.githubusercontent.com:sub", "repo:beatrix-dev/gym-app:ref:refs/heads/main",
                "token.actions.githubusercontent.com:aud", "sts.amazonaws.com");
        Map<String, Object> statement = Map.of(
                "Action", "sts:AssumeRoleWithWebIdentity",
                "Condition", Map.of("StringEquals", conditions));
        Map<String, Map<String, Object>> trusted = template.findResources(
                "AWS::IAM::Role",
                Match.objectLike(Map.of("Properties", Match.objectLike(Map.of(
                        "AssumeRolePolicyDocument",
                        Match.objectLike(Map.of("Statement", List.of(Match.objectLike(statement)))))))));
        assertEquals(3, trusted.size());
    }

    @Test
    void infraRoleMayOnlyAssumeCdkBootstrapRoles() {
        template.hasResourceProperties(
                "AWS::IAM::Policy",
                policyOn("InfraRole", List.of(Map.of(
                        "Action", "sts:AssumeRole",
                        "Effect", "Allow",
                        "Resource", "arn:aws:iam::" + ACCOUNT + ":role/cdk-*"))));
    }

    @Test
    void backendReleaseRoleHasAccountWideActionsOnly() {
        template.hasResourceProperties(
                "AWS::IAM::Policy",
                policyOn("BackendReleaseRole", Match.arrayEquals(List.of(
                        Map.of("Action", "ecr:GetAuthorizationToken", "Effect", "Allow", "Resource", "*"),
                        Map.of(
                                "Action", List.of("ecs:DescribeTaskDefinition", "ecs:RegisterTaskDefinition"),
                                "Effect", "Allow",
                                "Resource", "*"),
                        Map.of(
                                "Action", List.of("ssm:GetParameter", "ssm:GetParameters"),
                                "Effect", "Allow",
                                "Resource", GYM_PARAMETERS),
                        Map.of(
                                "Action", "ssm:PutParameter",
                                "Effect", "Allow",
                                "Resource",
                                "arn:aws:ssm:eu-west-1:" + ACCOUNT + ":parameter/gym/backend/image-tag")))));
    }

    @Test
    void frontendReleaseRoleMayOnlyReadGymParameters() {
        template.hasResourceProperties(
                "AWS::IAM::Policy",
                policyOn("FrontendReleaseRole", Match.arrayEquals(List.of(Map.of(
                        "Action", List.of("ssm:GetParameter", "ssm:GetParameters"),
                        "Effect", "Allow",
                        "Resource", GYM_PARAMETERS)))));
    }

    @Test
    void outputsEachRoleArn() {
        Map<String, Map<String, Object>> outputs = template.findOutputs("*");
        assertTrue(outputs.keySet().containsAll(
                List.of("InfraRoleArn", "BackendReleaseRoleArn", "FrontendReleaseRoleArn")));
        assertTrue(!outputs.containsKey("DeployRoleArn"));
    }

    private static Matcher policyOn(String roleLogicalIdPrefix, Object statements) {
        return Match.objectLike(Map.of(
                "PolicyDocument", Match.objectLike(Map.of("Statement", statements)),
                "Roles", List.of(Map.of("Ref", Match.stringLikeRegexp("^" + roleLogicalIdPrefix)))));
    }
}
