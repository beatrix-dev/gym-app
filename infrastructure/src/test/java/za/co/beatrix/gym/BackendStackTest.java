package za.co.beatrix.gym;

import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import software.amazon.awscdk.assertions.Match;
import software.amazon.awscdk.assertions.Template;

/**
 * GymBackend is the environment the backend runs in. The ECS service and task definition are owned by the backend
 * release (backend/deploy), so CDK must never declare them: two owners is what causes drift.
 */
class BackendStackTest {

    private final GymStacks stacks = TestStacks.create();
    private final Template template = Template.fromStack(stacks.backend());

    @Test
    void declaresNoEcsServiceOrTaskDefinition() {
        template.resourceCountIs("AWS::ECS::Service", 0);
        template.resourceCountIs("AWS::ECS::TaskDefinition", 0);
        assertTrue(template.findParameters("*", Match.objectLike(Map.of("Default", "/gym/backend/image-tag")))
                .isEmpty());
    }

    @Test
    void createsTheClusterAndLogGroup() {
        template.resourceCountIs("AWS::ECS::Cluster", 1);
        template.hasResourceProperties(
                "AWS::Logs::LogGroup", Match.objectLike(Map.of("LogGroupName", "/gym/backend", "RetentionInDays", 14)));
    }

    @Test
    void cloudMapServiceUsesSrvRecordsWithEcsHealthChecks() {
        template.hasResourceProperties(
                "AWS::ServiceDiscovery::Service",
                Match.objectLike(Map.of(
                        "Name", "backend",
                        "DnsConfig", Match.objectLike(Map.of(
                                "DnsRecords", List.of(Match.objectLike(Map.of("Type", "SRV"))))),
                        "HealthCheckCustomConfig", Map.of("FailureThreshold", 1))));
        template.hasResourceProperties(
                "AWS::ServiceDiscovery::PrivateDnsNamespace", Map.of("Name", "gym.internal", "Vpc", Match.anyValue()));
    }

    @Test
    void databaseAcceptsMysqlOnlyFromBackendSecurityGroup() {
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
    void waitsForTheDatabaseStack() {
        // The container migrates on start, so the database must be complete before any release can run.
        assertTrue(stacks.backend().getDependencies().contains(stacks.database()));
    }

    @Test
    void executionRoleCanReadTheDatabaseSecretAndPullImages() {
        Object trustsEcsTasks = Match.objectLike(Map.of(
                "Statement",
                List.of(Match.objectLike(Map.of("Principal", Map.of("Service", "ecs-tasks.amazonaws.com"))))));
        Object executionPolicy = Map.of(
                "Fn::Join",
                List.of("", Match.arrayWith(List.of(":iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"))));
        template.hasResourceProperties(
                "AWS::IAM::Role",
                Match.objectLike(Map.of(
                        "AssumeRolePolicyDocument", trustsEcsTasks,
                        "ManagedPolicyArns", List.of(executionPolicy))));

        Object readSecret = Match.objectLike(Map.of(
                "Action", List.of("secretsmanager:GetSecretValue", "secretsmanager:DescribeSecret"),
                "Resource", Map.of("Fn::ImportValue", Match.anyValue())));
        template.hasResourceProperties(
                "AWS::IAM::Policy",
                Match.objectLike(Map.of(
                        "PolicyDocument", Match.objectLike(Map.of("Statement", Match.arrayWith(List.of(readSecret)))),
                        "Roles", List.of(Map.of("Ref", Match.stringLikeRegexp("^BackendExecutionRole"))))));
    }

    @Test
    void publishesEverythingTheReleaseNeeds() {
        for (String name : List.of(
                "/gym/backend/cluster-name",
                "/gym/backend/cloud-map-service-arn",
                "/gym/backend/security-group-id",
                "/gym/backend/subnet-ids",
                "/gym/backend/task-role-arn",
                "/gym/backend/execution-role-arn",
                "/gym/backend/log-group-name",
                "/gym/backend/db-secret-arn")) {
            template.hasResourceProperties("AWS::SSM::Parameter", Match.objectLike(Map.of("Name", name)));
        }
        template.resourceCountIs("AWS::SSM::Parameter", 8);
    }

    @Test
    void releaseRoleMayCreateAndUpdateServicesInThisClusterOnly() {
        Object manageServices = Match.objectLike(Map.of(
                "Action", List.of("ecs:CreateService", "ecs:DescribeServices", "ecs:UpdateService"),
                "Resource", Map.of("Fn::Join", List.of("", Match.arrayWith(List.of(
                        Map.of("Ref", Match.stringLikeRegexp("^BackendCluster"))))))));
        Object passRoles = Match.objectLike(Map.of(
                "Action", "iam:PassRole",
                "Resource", Match.arrayWith(List.of(
                        Map.of("Fn::GetAtt", List.of(Match.stringLikeRegexp("^BackendTaskRole"), "Arn")),
                        Map.of("Fn::GetAtt", List.of(Match.stringLikeRegexp("^BackendExecutionRole"), "Arn"))))));
        template.hasResourceProperties(
                "AWS::IAM::Policy",
                Match.objectLike(Map.of(
                        "Roles", List.of("gym-ci-backend-release"),
                        "PolicyDocument",
                        Match.objectLike(Map.of("Statement", Match.arrayWith(List.of(manageServices, passRoles)))))));
    }
}
