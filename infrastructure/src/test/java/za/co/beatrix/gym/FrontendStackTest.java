package za.co.beatrix.gym;

import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import software.amazon.awscdk.assertions.Match;
import software.amazon.awscdk.assertions.Template;

class FrontendStackTest {

    private final Template template = Template.fromStack(TestStacks.create().frontend());

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
    void hasNoBucketDeployment() {
        template.resourceCountIs("Custom::CDKBucketDeployment", 0);
    }

    @Test
    void writesBucketAndDistributionParameters() {
        template.hasResourceProperties(
                "AWS::SSM::Parameter", Match.objectLike(Map.of("Name", "/gym/frontend/bucket-name")));
        template.hasResourceProperties(
                "AWS::SSM::Parameter", Match.objectLike(Map.of("Name", "/gym/frontend/distribution-id")));
        template.hasResourceProperties(
                "AWS::SSM::Parameter", Match.objectLike(Map.of("Name", "/gym/frontend/domain-name")));
    }

    @Test
    void outputsCloudFrontDomainForTheDnsRecord() {
        template.hasOutput(
                "CloudFrontDomain",
                Match.objectLike(Map.of(
                        "Value",
                        Map.of("Fn::GetAtt", List.of(Match.stringLikeRegexp("^FrontendDistribution"), "DomainName")))));
    }

    @Test
    void grantsReleaseRoleUploadAndInvalidation() {
        Map<String, Map<String, Object>> policies = template.findResources(
                "AWS::IAM::Policy",
                Match.objectLike(Map.of(
                        "Properties", Match.objectLike(Map.of("Roles", List.of("gym-ci-frontend-release"))))));
        String rendered = policies.toString();
        for (String action : List.of("s3:PutObject", "s3:DeleteObject*", "s3:List*", "cloudfront:CreateInvalidation")) {
            assertTrue(rendered.contains(action), "missing " + action);
        }
    }
}
