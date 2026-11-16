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

/**
 * GitHub Actions assumes one of three roles through OIDC, one per release type. Only the main branch may assume
 * them. The roles have fixed names so the resource stacks can grant them access to their own resources; this stack
 * holds only the permissions that are not tied to one resource.
 */
public class CiStack extends Stack {

    static final String INFRA_ROLE = "gym-ci-infra";
    static final String BACKEND_RELEASE_ROLE = "gym-ci-backend-release";
    static final String FRONTEND_RELEASE_ROLE = "gym-ci-frontend-release";

    private static final String GITHUB_OIDC_HOST = "token.actions.githubusercontent.com";

    public CiStack(Construct scope, String id, StackProps props, String githubRepo) {
        super(scope, id, props);

        OidcProviderNative provider = OidcProviderNative.Builder.create(this, "GithubOidc")
                .url("https://" + GITHUB_OIDC_HOST)
                .clientIds(List.of("sts.amazonaws.com"))
                .build();

        String gymParameters = "arn:aws:ssm:" + getRegion() + ":" + getAccount() + ":parameter" + SsmNames.PREFIX + "*";
        PolicyStatement readGymParameters = allow(List.of("ssm:GetParameter", "ssm:GetParameters"), gymParameters);

        Role infra = githubRole("InfraRole", INFRA_ROLE, provider, githubRepo);
        infra.addToPolicy(allow(List.of("sts:AssumeRole"), "arn:aws:iam::" + getAccount() + ":role/cdk-*"));

        Role backend = githubRole("BackendReleaseRole", BACKEND_RELEASE_ROLE, provider, githubRepo);
        backend.addToPolicy(allow(List.of("ecr:GetAuthorizationToken"), "*"));
        backend.addToPolicy(allow(List.of("ecs:DescribeTaskDefinition", "ecs:RegisterTaskDefinition"), "*"));
        backend.addToPolicy(readGymParameters);
        backend.addToPolicy(allow(
                List.of("ssm:PutParameter"),
                "arn:aws:ssm:" + getRegion() + ":" + getAccount() + ":parameter" + SsmNames.IMAGE_TAG));

        Role frontend = githubRole("FrontendReleaseRole", FRONTEND_RELEASE_ROLE, provider, githubRepo);
        frontend.addToPolicy(readGymParameters);

        CfnOutput.Builder.create(this, "InfraRoleArn").value(infra.getRoleArn()).build();
        CfnOutput.Builder.create(this, "BackendReleaseRoleArn").value(backend.getRoleArn()).build();
        CfnOutput.Builder.create(this, "FrontendReleaseRoleArn").value(frontend.getRoleArn()).build();
    }

    private Role githubRole(String id, String name, OidcProviderNative provider, String githubRepo) {
        return Role.Builder.create(this, id)
                .roleName(name)
                .assumedBy(new WebIdentityPrincipal(
                        provider.getOidcProviderArn(),
                        Map.of("StringEquals", Map.of(
                                GITHUB_OIDC_HOST + ":sub", "repo:" + githubRepo + ":ref:refs/heads/main",
                                GITHUB_OIDC_HOST + ":aud", "sts.amazonaws.com"))))
                .build();
    }

    private static PolicyStatement allow(List<String> actions, String resource) {
        return PolicyStatement.Builder.create()
                .actions(actions)
                .resources(List.of(resource))
                .build();
    }
}
