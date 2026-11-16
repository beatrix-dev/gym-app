package za.co.beatrix.gym;

import java.util.List;
import software.amazon.awscdk.Stack;
import software.amazon.awscdk.StackProps;
import software.amazon.awscdk.services.ec2.IVpc;
import software.constructs.Construct;

/** The VPC that the database, the backend service and the API Gateway VPC Link share. */
public class NetworkStack extends Stack {

    private static final List<String> AVAILABILITY_ZONES = List.of(GymApp.REGION + "a", GymApp.REGION + "b");

    private final Network network;

    public NetworkStack(Construct scope, String id, StackProps props) {
        super(scope, id, props);
        this.network = new Network(this, "Network");
    }

    public IVpc getVpc() {
        return network.getVpc();
    }

    /** Fixed so synth never needs credentials for an availability-zone lookup. */
    @Override
    public List<String> getAvailabilityZones() {
        return AVAILABILITY_ZONES;
    }
}
