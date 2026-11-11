package za.co.beatrix.gym;

import java.util.List;
import java.util.Map;
import software.amazon.awscdk.CfnOutput;
import software.amazon.awscdk.Stack;
import software.amazon.awscdk.StackProps;
import software.amazon.awscdk.services.iam.OidcProviderNative;
import software.amazon.awscdk.services.iam.PolicyStatement;
import software.amazon.awscdk.services.iam.Role;
import software.amazon.awscdk.services.iam.WebIdentityPrincipal;
import software.constructs.Construct;

/** GitHub Actions deploys by assuming this role through OIDC; it may only assume the CDK bootstrap roles. */
public class CiStack extends Stack {

    private static final String GITHUB_OIDC_HOST = "token.actions.githubusercontent.com";

    public CiStack(Construct scope, String id, StackProps props, String githubRepo) {
        super(scope, id, props);

        OidcProviderNative provider = OidcProviderNative.Builder.create(this, "GithubOidc")
                .url("https://" + GITHUB_OIDC_HOST)
                .clientIds(List.of("sts.amazonaws.com"))
                .build();

        Role deployRole = Role.Builder.create(this, "DeployRole")
                .assumedBy(new WebIdentityPrincipal(
                        provider.getOidcProviderArn(),
                        Map.of("StringEquals", Map.of(
                                GITHUB_OIDC_HOST + ":sub", "repo:" + githubRepo + ":ref:refs/heads/main",
                                GITHUB_OIDC_HOST + ":aud", "sts.amazonaws.com"))))
                .build();

        deployRole.addToPolicy(PolicyStatement.Builder.create()
                .actions(List.of("sts:AssumeRole"))
                .resources(List.of("arn:aws:iam::" + getAccount() + ":role/cdk-*"))
                .build());

        CfnOutput.Builder.create(this, "DeployRoleArn")
                .value(deployRole.getRoleArn())
                .build();
    }
}
