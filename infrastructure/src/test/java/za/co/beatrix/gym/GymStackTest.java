package za.co.beatrix.gym;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;
import java.util.stream.Stream;
import org.junit.jupiter.api.Test;
import software.amazon.awscdk.App;
import software.amazon.awscdk.Environment;
import software.amazon.awscdk.StackProps;
import software.amazon.awscdk.assertions.Match;
import software.amazon.awscdk.assertions.Matcher;
import software.amazon.awscdk.assertions.Template;

class GymStackTest {

    private static final String ACCOUNT = "123456789012";

    private static final Path outDir = createOutDir();

    private final Template template = buildTemplate();

    private static Path createOutDir() {
        try {
            return Files.createTempDirectory("gym-cdk-out");
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    private static Template buildTemplate() {
        App app = App.Builder.create().outdir(outDir.toString()).build();
        StackProps props = StackProps.builder()
                .env(Environment.builder().account(ACCOUNT).region("eu-west-1").build())
                .crossRegionReferences(true)
                .build();
        CertificateStack certificate = new CertificateStack(
                app,
                "TestCertificate",
                StackProps.builder()
                        .env(Environment.builder().account(ACCOUNT).region("us-east-1").build())
                        .crossRegionReferences(true)
                        .build(),
                "app.example.com");
        return Template.fromStack(new GymStack(
                app, "TestGym", props, certificate.getCertificate(), "a@b.c", "google-client-id"));
    }

    @Test
    void hasNoNatGatewayOrLoadBalancer() {
        template.resourceCountIs("AWS::EC2::NatGateway", 0);
        template.resourceCountIs("AWS::ElasticLoadBalancingV2::LoadBalancer", 0);
    }

    @Test
    void auroraServerlessV2ScalesToZero() {
        template.hasResourceProperties(
                "AWS::RDS::DBCluster",
                Match.objectLike(Map.of(
                        "Engine", "aurora-mysql",
                        "StorageEncrypted", true,
                        "ServerlessV2ScalingConfiguration", Map.of("MinCapacity", 0, "MaxCapacity", 2))));
    }

    @Test
    void databaseInstanceIsNotPubliclyAccessible() {
        template.hasResourceProperties(
                "AWS::RDS::DBInstance",
                Match.objectLike(Map.of("DBInstanceClass", "db.serverless", "PubliclyAccessible", false)));
    }

    @Test
    void databaseAcceptsMysqlOnlyFromServiceSecurityGroup() {
        template.resourceCountIs("AWS::EC2::SecurityGroupIngress", 2);
        template.hasResourceProperties(
                "AWS::EC2::SecurityGroupIngress",
                Match.objectLike(Map.of(
                        "IpProtocol", "tcp",
                        "SourceSecurityGroupId",
                        Map.of("Fn::GetAtt", List.of(Match.stringLikeRegexp("^BackendSecurityGroup"), "GroupId")))));
        template.hasResourceProperties(
                "AWS::RDS::DBCluster", Match.objectLike(Map.of("Port", Match.absent())));
    }

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

    private static Matcher containerWith(String property, Object matcher) {
        return Match.objectLike(Map.of(
                "ContainerDefinitions", List.of(Match.objectLike(Map.of(property, matcher)))));
    }

    @Test
    void appClientIsGoogleOnlyCodeGrantWithoutPasswordFlows() {
        template.hasResourceProperties(
                "AWS::Cognito::UserPoolClient",
                Match.objectLike(Map.of(
                        "SupportedIdentityProviders", List.of("Google"),
                        "GenerateSecret", false,
                        "AllowedOAuthFlows", List.of("code"),
                        "ExplicitAuthFlows", List.of("ALLOW_REFRESH_TOKEN_AUTH"))));
    }

    @Test
    void backendAcceptsApiPortOnlyFromVpcLinkSecurityGroup() {
        template.hasResourceProperties(
                "AWS::EC2::SecurityGroupIngress",
                Match.objectLike(Map.of(
                        "IpProtocol", "tcp",
                        "FromPort", 8100,
                        "ToPort", 8100,
                        "GroupId",
                        Map.of("Fn::GetAtt", List.of(Match.stringLikeRegexp("^BackendSecurityGroup"), "GroupId")),
                        "SourceSecurityGroupId",
                        Map.of("Fn::GetAtt", List.of(Match.stringLikeRegexp("^ApiVpcLinkSecurityGroup"), "GroupId")))));
    }

    @Test
    void apiIntegratesThroughVpcLink() {
        template.hasResourceProperties(
                "AWS::ApiGatewayV2::Integration", Match.objectLike(Map.of("ConnectionType", "VPC_LINK")));
    }

    @Test
    void onlyHealthRoutesAreUnauthenticated() {
        template.resourceCountIs("AWS::ApiGatewayV2::Route", 3);
        template.hasResourceProperties(
                "AWS::ApiGatewayV2::Route",
                Match.objectLike(Map.of("RouteKey", "ANY /api/{proxy+}", "AuthorizationType", "JWT")));
        for (String route : List.of("GET /api/health", "GET /api/health/db")) {
            template.hasResourceProperties(
                    "AWS::ApiGatewayV2::Route",
                    Match.objectLike(Map.of("RouteKey", route, "AuthorizationType", "NONE")));
        }
    }

    @Test
    void userPoolKeepsSelfSignUpEnabledSoFederatedFirstSignInCannotBeBlocked() {
        template.hasResourceProperties(
                "AWS::Cognito::UserPool",
                Match.objectLike(Map.of(
                        "AdminCreateUserConfig", Match.objectLike(Map.of("AllowAdminCreateUserOnly", false)))));
    }

    @Test
    void bucketIsPrivate() {
        template.hasResourceProperties(
                "AWS::S3::Bucket",
                Match.objectLike(Map.of(
                        "PublicAccessBlockConfiguration",
                        Map.of(
                                "BlockPublicAcls", true,
                                "BlockPublicPolicy", true,
                                "IgnorePublicAcls", true,
                                "RestrictPublicBuckets", true))));
    }

    @Test
    void distributionServesAppDomainWithoutErrorResponses() {
        template.resourceCountIs("AWS::CloudFront::Distribution", 1);
        template.hasResourceProperties(
                "AWS::CloudFront::Distribution",
                Match.objectLike(Map.of("DistributionConfig", Match.objectLike(Map.of(
                        "Aliases", List.of("app.beatrix.co.za"),
                        "CustomErrorResponses", Match.absent())))));
    }

    @Test
    void onlyDefaultBehaviourRewritesSpaRoutes() {
        template.hasResourceProperties(
                "AWS::CloudFront::Distribution",
                Match.objectLike(Map.of("DistributionConfig", Match.objectLike(Map.of(
                        "DefaultCacheBehavior", Match.objectLike(Map.of(
                                "FunctionAssociations",
                                List.of(Match.objectLike(Map.of("EventType", "viewer-request"))))))))));
        template.hasResourceProperties(
                "AWS::CloudFront::Distribution",
                Match.objectLike(Map.of("DistributionConfig", Match.objectLike(Map.of(
                        "CacheBehaviors", List.of(Match.objectLike(Map.of(
                                "PathPattern", "/api/*",
                                "CachePolicyId", "4135ea2d-6df8-44a3-9df3-4b5a84be39ad",
                                "FunctionAssociations", Match.absent()))))))));
        template.resourceCountIs("AWS::CloudFront::Function", 1);
    }

    @Test
    void onlyGeneratedConfigJsonIsDeployed() throws IOException {
        template.hasResourceProperties(
                "Custom::CDKBucketDeployment",
                Match.objectLike(Map.of(
                        "SourceObjectKeys", Match.arrayEquals(List.of(Match.anyValue(), Match.anyValue())),
                        "DistributionPaths", List.of("/*"))));
        // The generated config.json is a second, inline source; the staged dist asset must not also carry one.
        try (Stream<Path> assets = Files.list(outDir)) {
            List<Path> distAssets = assets.filter(p -> p.getFileName().toString().startsWith("asset.")
                            && Files.isRegularFile(p.resolve("index.html")))
                    .toList();
            assertEquals(1, distAssets.size());
            assertFalse(Files.exists(distAssets.get(0).resolve("config.json")));
        }
    }
}
