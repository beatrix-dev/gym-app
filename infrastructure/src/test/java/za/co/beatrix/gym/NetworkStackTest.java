package za.co.beatrix.gym;

import org.junit.jupiter.api.Test;
import software.amazon.awscdk.assertions.Template;

class NetworkStackTest {

    private final Template template = Template.fromStack(TestStacks.create().network());

    @Test
    void hasNoNatGatewayOrLoadBalancer() {
        template.resourceCountIs("AWS::EC2::NatGateway", 0);
        template.resourceCountIs("AWS::ElasticLoadBalancingV2::LoadBalancer", 0);
    }
}
