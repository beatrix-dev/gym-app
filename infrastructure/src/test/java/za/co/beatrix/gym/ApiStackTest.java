package za.co.beatrix.gym;

import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import software.amazon.awscdk.assertions.Match;
import software.amazon.awscdk.assertions.Template;

class ApiStackTest {

    private final GymStacks stacks = TestStacks.create();
    private final Template template = Template.fromStack(stacks.api());

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
    void backendAcceptsApiPortOnlyFromVpcLinkSecurityGroup() {
        template.hasResourceProperties(
                "AWS::EC2::SecurityGroupIngress",
                Match.objectLike(Map.of(
                        "IpProtocol", "tcp",
                        "FromPort", 8100,
                        "ToPort", 8100,
                        "GroupId", Map.of("Fn::ImportValue", Match.anyValue()),
                        "SourceSecurityGroupId",
                        Map.of("Fn::GetAtt", List.of(Match.stringLikeRegexp("^ApiVpcLinkSecurityGroup"), "GroupId")))));
        // Only the database rule lives in the backend stack.
        Template.fromStack(stacks.backend()).resourceCountIs("AWS::EC2::SecurityGroupIngress", 1);
    }
}
