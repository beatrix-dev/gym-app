package za.co.beatrix.gym;

import software.amazon.awscdk.App;

public class GymApp {

    static final String DOMAIN = "app.beatrix.co.za";
    static final String REGION = "eu-west-1";
    /** CloudFront certificates must be issued in us-east-1. */
    static final String CERTIFICATE_REGION = "us-east-1";
    /**
     * The repository as it appears in GitHub's OIDC subject claim. This repo uses immutable subjects
     * (owner@ownerId/repo@repoId), so a rename of the owner or the repo cannot be used to take over the CI roles.
     */
    static final String GITHUB_REPO = "beatrix-dev@257955182/gym-app@1314188794";

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
