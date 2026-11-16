package za.co.beatrix.gym;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;
import java.util.stream.Stream;
import org.junit.jupiter.api.Test;
import software.amazon.awscdk.Stack;
import software.amazon.awscdk.Stage;
import software.amazon.awscdk.assertions.Match;
import software.amazon.awscdk.assertions.Matcher;
import software.amazon.awscdk.assertions.Template;
import software.constructs.IConstruct;

class BackendStackTest {

    private final GymStacks stacks = TestStacks.create();
    private final Template template = Template.fromStack(stacks.backend());

    @Test
    void serviceRunsInPublicSubnetsAndRegistersInCloudMap() {
        template.hasResourceProperties(
                "AWS::ECS::Service",
                Match.objectLike(Map.of(
                        "NetworkConfiguration",
                        Match.objectLike(Map.of(
                                "AwsvpcConfiguration", Match.objectLike(Map.of("AssignPublicIp", "ENABLED")))),
                        "ServiceRegistries", Match.anyValue(),
                        "DeploymentConfiguration",
                        Match.objectLike(Map.of("MinimumHealthyPercent", 100, "MaximumPercent", 200)))));
    }

    @Test
    void serviceWaitsForDatabaseStack() {
        // The entrypoint migrates on start, so tasks crash-loop if they start before the writer instance exists.
        assertTrue(stacks.backend().getDependencies().contains(stacks.database()));
    }

    @Test
    void cloudMapServiceUsesSrvRecords() {
        template.hasResourceProperties(
                "AWS::ServiceDiscovery::Service",
                Match.objectLike(Map.of(
                        "Name", "backend",
                        "DnsConfig", Match.objectLike(Map.of(
                                "DnsRecords", List.of(Match.objectLike(Map.of("Type", "SRV"))))))));
        template.hasResourceProperties(
                "AWS::ServiceDiscovery::PrivateDnsNamespace", Map.of("Name", "gym.internal", "Vpc", Match.anyValue()));
    }

    @Test
    void databaseAcceptsMysqlOnlyFromServiceSecurityGroup() {
        template.hasResourceProperties(
                "AWS::EC2::SecurityGroupIngress",
                Match.objectLike(Map.of(
                        "IpProtocol", "tcp",
                        "GroupId", Map.of("Fn::ImportValue", Match.anyValue()),
                        "SourceSecurityGroupId",
                        Map.of("Fn::GetAtt", List.of(Match.stringLikeRegexp("^BackendSecurityGroup"), "GroupId")))));
        Template.fromStack(stacks.database()).resourceCountIs("AWS::EC2::SecurityGroupIngress", 0);
    }

    @Test
    void databaseCredentialsAreSecretsNotEnvironment() {
        template.hasResourceProperties(
                "AWS::ECS::TaskDefinition",
                Match.objectLike(Map.of(
                        "Cpu", "256",
                        "Memory", "512",
                        "RuntimePlatform", Match.objectLike(Map.of("CpuArchitecture", "X86_64")))));
        for (String name : List.of("DB_HOST", "DB_PORT", "DB_USER", "DB_PASSWORD")) {
            template.hasResourceProperties(
                    "AWS::ECS::TaskDefinition",
                    containerWith("Secrets", Match.arrayWith(List.of(Match.objectLike(Map.of("Name", name))))));
        }
        template.hasResourceProperties(
                "AWS::ECS::TaskDefinition",
                containerWith(
                        "Environment",
                        Match.not(Match.arrayWith(List.of(Match.objectLike(Map.of("Name", "DB_PASSWORD")))))));
    }

    @Test
    void backendHasNoEmailAllowlist() {
        template.hasResourceProperties(
                "AWS::ECS::TaskDefinition",
                containerWith(
                        "Environment",
                        Match.not(Match.arrayWith(List.of(Match.objectLike(Map.of("Name", "ALLOWED_EMAILS")))))));
    }

    @Test
    void imageComesFromRegistryAndImageTagParameter() {
        Map<String, Map<String, Object>> tagParameters = template.findParameters(
                "*",
                Match.objectLike(Map.of(
                        "Type", "AWS::SSM::Parameter::Value<String>",
                        "Default", "/gym/backend/image-tag")));
        assertTrue(tagParameters.size() == 1);
        String tagParameter = tagParameters.keySet().iterator().next();
        template.hasResourceProperties(
                "AWS::ECS::TaskDefinition",
                containerWith(
                        "Image",
                        Map.of("Fn::Join", List.of(
                                "", Match.arrayWith(List.of(Map.of("Ref", tagParameter)))))));
    }

    @Test
    void hasNoDockerAsset() throws IOException {
        Path outDir = Path.of(Stage.of(stacks.backend()).synth().getDirectory());
        try (Stream<Path> files = Files.list(outDir)) {
            assertFalse(files.anyMatch(p -> p.getFileName().toString().startsWith("asset.")
                    && Files.isRegularFile(p.resolve("Dockerfile"))));
        }
    }

    @Test
    void neverWritesImageTagParameter() {
        for (IConstruct child : Stage.of(stacks.backend()).getNode().getChildren()) {
            if (child instanceof Stack stack) {
                assertTrue(Template.fromStack(stack)
                        .findResources(
                                "AWS::SSM::Parameter",
                                Match.objectLike(Map.of(
                                        "Properties", Match.objectLike(Map.of("Name", "/gym/backend/image-tag")))))
                        .isEmpty());
            }
        }
    }

    @Test
    void writesClusterAndServiceNameParameters() {
        template.hasResourceProperties(
                "AWS::SSM::Parameter", Match.objectLike(Map.of("Name", "/gym/backend/cluster-name")));
        template.hasResourceProperties(
                "AWS::SSM::Parameter", Match.objectLike(Map.of("Name", "/gym/backend/service-name")));
    }

    @Test
    void grantsReleaseRoleDeployOnServiceOnly() {
        Object updateService = Match.objectLike(Map.of(
                "Action", List.of("ecs:DescribeServices", "ecs:UpdateService"),
                "Resource", Map.of("Ref", Match.stringLikeRegexp("^BackendService"))));
        Object passRole = Match.objectLike(Map.of(
                "Action", "iam:PassRole",
                "Resource", Match.arrayWith(List.of(
                        Map.of("Fn::GetAtt", List.of(Match.stringLikeRegexp("^BackendTaskDefTaskRole"), "Arn")),
                        Map.of("Fn::GetAtt", List.of(Match.stringLikeRegexp("^BackendTaskDefExecutionRole"), "Arn"))))));
        template.hasResourceProperties(
                "AWS::IAM::Policy",
                Match.objectLike(Map.of(
                        "Roles", List.of("gym-ci-backend-release"),
                        "PolicyDocument",
                        Match.objectLike(Map.of("Statement", Match.arrayWith(List.of(updateService, passRole)))))));
    }

    private static Matcher containerWith(String property, Object matcher) {
        return Match.objectLike(Map.of(
                "ContainerDefinitions", List.of(Match.objectLike(Map.of(property, matcher)))));
    }
}
