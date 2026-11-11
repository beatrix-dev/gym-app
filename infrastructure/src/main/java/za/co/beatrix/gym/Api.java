package za.co.beatrix.gym;

import java.util.List;
import software.amazon.awscdk.services.apigatewayv2.AddRoutesOptions;
import software.amazon.awscdk.services.apigatewayv2.HttpApi;
import software.amazon.awscdk.services.apigatewayv2.HttpMethod;
import software.amazon.awscdk.services.apigatewayv2.VpcLink;
import software.amazon.awscdk.aws_apigatewayv2_authorizers.HttpUserPoolAuthorizer;
import software.amazon.awscdk.aws_apigatewayv2_integrations.HttpServiceDiscoveryIntegration;
import software.amazon.awscdk.services.ec2.Port;
import software.amazon.awscdk.services.ec2.SecurityGroup;
import software.amazon.awscdk.services.ec2.SubnetSelection;
import software.constructs.Construct;

/** HTTP API reaching the backend through a VPC Link and Cloud Map; only /api/{proxy+} requires a Cognito JWT. */
public class Api extends Construct {

    private final HttpApi httpApi;

    public Api(Construct scope, String id, ApiProps props) {
        super(scope, id);

        SecurityGroup vpcLinkSecurityGroup = SecurityGroup.Builder.create(this, "VpcLinkSecurityGroup")
                .vpc(props.vpc())
                .description("API Gateway VPC Link")
                .build();
        props.backend().getSecurityGroup().addIngressRule(
                vpcLinkSecurityGroup, Port.tcp(BackendService.PORT), "API Gateway VPC Link");

        VpcLink vpcLink = VpcLink.Builder.create(this, "VpcLink")
                .vpc(props.vpc())
                .subnets(SubnetSelection.builder().subnetGroupName(Network.PUBLIC_SUBNET).build())
                .securityGroups(List.of(vpcLinkSecurityGroup))
                .build();

        HttpServiceDiscoveryIntegration integration = HttpServiceDiscoveryIntegration.Builder.create(
                        "Backend", props.backend().getService().getCloudMapService())
                .vpcLink(vpcLink)
                .build();

        this.httpApi = HttpApi.Builder.create(this, "HttpApi").build();

        httpApi.addRoutes(AddRoutesOptions.builder()
                .path("/api/health")
                .methods(List.of(HttpMethod.GET))
                .integration(integration)
                .build());
        httpApi.addRoutes(AddRoutesOptions.builder()
                .path("/api/health/db")
                .methods(List.of(HttpMethod.GET))
                .integration(integration)
                .build());
        httpApi.addRoutes(AddRoutesOptions.builder()
                .path("/api/{proxy+}")
                .methods(List.of(HttpMethod.ANY))
                .integration(integration)
                .authorizer(HttpUserPoolAuthorizer.Builder.create("UserPoolAuthorizer", props.userPool())
                        .userPoolClients(List.of(props.client()))
                        .build())
                .build());
    }

    public HttpApi getHttpApi() {
        return httpApi;
    }
}
