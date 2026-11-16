package za.co.beatrix.gym;

import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import software.amazon.awscdk.assertions.Match;
import software.amazon.awscdk.assertions.Template;

class RegistryStackTest {

    private final Template template = Template.fromStack(TestStacks.create().registry());

    @Test
    void repositoryHasImmutableTagsAndKeepsTwentyImages() {
        template.hasResourceProperties(
                "AWS::ECR::Repository",
                Match.objectLike(Map.of(
                        "RepositoryName", "gym-backend",
                        "ImageTagMutability", "IMMUTABLE",
                        "LifecyclePolicy",
                        Map.of("LifecyclePolicyText", Match.stringLikeRegexp("\"countNumber\":20")))));
    }

    @Test
    void writesRepositoryUriParameter() {
        template.hasResourceProperties(
                "AWS::SSM::Parameter", Match.objectLike(Map.of("Name", "/gym/registry/repository-uri")));
    }

    @Test
    void grantsPushToBackendReleaseRoleOnly() {
        Object repositoryArn = Map.of("Fn::GetAtt", List.of(Match.stringLikeRegexp("^Repository"), "Arn"));
        Object push = Match.objectLike(Map.of(
                "Action", Match.arrayWith(List.of("ecr:PutImage")), "Resource", repositoryArn));
        Object describe = Match.objectLike(Map.of("Action", "ecr:DescribeImages", "Resource", repositoryArn));

        template.resourceCountIs("AWS::IAM::Policy", 1);
        template.hasResourceProperties(
                "AWS::IAM::Policy",
                Match.objectLike(Map.of(
                        "Roles", List.of("gym-ci-backend-release"),
                        "PolicyDocument",
                        Match.objectLike(Map.of("Statement", Match.arrayWith(List.of(push, describe)))))));
    }
}
