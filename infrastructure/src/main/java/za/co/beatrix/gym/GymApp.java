package za.co.beatrix.gym;

import software.amazon.awscdk.App;

public class GymApp {

    static final String DOMAIN = "app.beatrix.co.za";
    static final String REGION = "eu-west-1";
    /** CloudFront certificates must be issued in us-east-1. */
    static final String CERTIFICATE_REGION = "us-east-1";
    static final String GITHUB_REPO = "beatrix-dev/gym-app";

    public static void main(String[] args) {
        String account = System.getenv("CDK_DEFAULT_ACCOUNT");
        if (account == null || account.isBlank()) {
            throw new IllegalStateException(
                    "CDK_DEFAULT_ACCOUNT is not set; configure AWS credentials or export it before running cdk.");
        }

        App app = new App();
        GymStacks.create(app, account);
        app.synth();
    }
}
