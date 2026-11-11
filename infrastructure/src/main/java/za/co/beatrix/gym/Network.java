package za.co.beatrix.gym;

import java.util.List;
import software.amazon.awscdk.services.ec2.IVpc;
import software.amazon.awscdk.services.ec2.SubnetConfiguration;
import software.amazon.awscdk.services.ec2.SubnetType;
import software.amazon.awscdk.services.ec2.Vpc;
import software.constructs.Construct;

/** Two AZs, no NAT: tasks sit in public subnets with public IPs, the database in isolated subnets. */
public class Network extends Construct {

    static final String PUBLIC_SUBNET = "public";
    static final String DB_SUBNET = "db";

    private final IVpc vpc;

    public Network(Construct scope, String id) {
        super(scope, id);
        this.vpc = Vpc.Builder.create(this, "Vpc")
                .maxAzs(2)
                .natGateways(0)
                .subnetConfiguration(List.of(
                        SubnetConfiguration.builder()
                                .name(PUBLIC_SUBNET)
                                .subnetType(SubnetType.PUBLIC)
                                .cidrMask(24)
                                .build(),
                        SubnetConfiguration.builder()
                                .name(DB_SUBNET)
                                .subnetType(SubnetType.PRIVATE_ISOLATED)
                                .cidrMask(24)
                                .build()))
                .build();
    }

    public IVpc getVpc() {
        return vpc;
    }
}
