package za.co.beatrix.gym;

import java.util.List;
import software.amazon.awscdk.CfnOutput;
import software.amazon.awscdk.Stack;
import software.amazon.awscdk.StackProps;
import software.amazon.awscdk.services.certificatemanager.ICertificate;
import software.constructs.Construct;

/** The application stack: network, database, backend service, Cognito and HTTP API (web hosting is added later). */
public class GymStack extends Stack {

    private static final String COGNITO_DOMAIN_PREFIX = "gym-beatrix";

    private static final List<String> AVAILABILITY_ZONES = List.of(GymApp.REGION + "a", GymApp.REGION + "b");

    public GymStack(
            Construct scope,
            String id,
            StackProps props,
            ICertificate certificate,
            String allowedEmails,
            String googleClientId) {
        super(scope, id, props);

        Auth auth = new Auth(this, "Auth", new AuthProps(COGNITO_DOMAIN_PREFIX, googleClientId));
        Network network = new Network(this, "Network");
        Database database = new Database(this, "Database", network.getVpc());
        BackendService backend = new BackendService(
                this,
                "Backend",
                new BackendServiceProps(
                        network.getVpc(),
                        database,
                        auth.getUserPool().getUserPoolId(),
                        auth.getClient().getUserPoolClientId(),
                        allowedEmails));
        new Api(this, "Api", new ApiProps(network.getVpc(), backend, auth.getUserPool(), auth.getClient()));

        String cognitoDomain = COGNITO_DOMAIN_PREFIX + ".auth." + GymApp.REGION + ".amazoncognito.com";
        CfnOutput.Builder.create(this, "CognitoDomain").value(cognitoDomain).build();
        CfnOutput.Builder.create(this, "UserPoolId")
                .value(auth.getUserPool().getUserPoolId())
                .build();
        CfnOutput.Builder.create(this, "UserPoolClientId")
                .value(auth.getClient().getUserPoolClientId())
                .build();
        CfnOutput.Builder.create(this, "GoogleRedirectUri")
                .value("https://" + cognitoDomain + "/oauth2/idpresponse")
                .build();
    }

    /** Fixed so synth never needs credentials for an availability-zone lookup. */
    @Override
    public List<String> getAvailabilityZones() {
        return AVAILABILITY_ZONES;
    }
}
