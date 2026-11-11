package za.co.beatrix.gym;

import java.util.List;
import software.amazon.awscdk.Stack;
import software.amazon.awscdk.StackProps;
import software.amazon.awscdk.services.certificatemanager.ICertificate;
import software.constructs.Construct;

/** The application stack: network, database and backend service (Cognito, API and web hosting are added later). */
public class GymStack extends Stack {

    // Task 8 replaces these with the real Cognito user pool and client.
    private static final String PLACEHOLDER_USER_POOL_ID = "placeholder-user-pool-id";
    private static final String PLACEHOLDER_USER_POOL_CLIENT_ID = "placeholder-user-pool-client-id";

    private static final List<String> AVAILABILITY_ZONES = List.of(GymApp.REGION + "a", GymApp.REGION + "b");

    public GymStack(
            Construct scope,
            String id,
            StackProps props,
            ICertificate certificate,
            String allowedEmails,
            String googleClientId) {
        super(scope, id, props);

        Network network = new Network(this, "Network");
        Database database = new Database(this, "Database", network.getVpc());
        new BackendService(
                this,
                "Backend",
                new BackendServiceProps(
                        network.getVpc(),
                        database,
                        PLACEHOLDER_USER_POOL_ID,
                        PLACEHOLDER_USER_POOL_CLIENT_ID,
                        allowedEmails));
    }

    /** Fixed so synth never needs credentials for an availability-zone lookup. */
    @Override
    public List<String> getAvailabilityZones() {
        return AVAILABILITY_ZONES;
    }
}
