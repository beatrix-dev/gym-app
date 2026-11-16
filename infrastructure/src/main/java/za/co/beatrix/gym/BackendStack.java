package za.co.beatrix.gym;

import java.util.List;
import software.amazon.awscdk.Stack;
import software.amazon.awscdk.StackProps;
import software.amazon.awscdk.services.ecs.FargateService;
import software.amazon.awscdk.services.iam.IRole;
import software.amazon.awscdk.services.iam.PolicyStatement;
import software.amazon.awscdk.services.iam.Role;
import software.amazon.awscdk.services.ssm.StringParameter;
import software.constructs.Construct;

/**
 * The backend service. Publishes the cluster and service names, and lets the backend release role roll out new
 * task definition revisions to this service only.
 */
public class BackendStack extends Stack {

    private final BackendService backend;

    public BackendStack(Construct scope, String id, StackProps props, BackendServiceProps backendProps) {
        super(scope, id, props);
        this.backend = new BackendService(this, "Backend", backendProps);
        FargateService service = backend.getService();

        StringParameter.Builder.create(this, "ClusterNameParameter")
                .parameterName(SsmNames.CLUSTER_NAME)
                .stringValue(service.getCluster().getClusterName())
                .build();
        StringParameter.Builder.create(this, "ServiceNameParameter")
                .parameterName(SsmNames.SERVICE_NAME)
                .stringValue(service.getServiceName())
                .build();

        IRole releaseRole = Role.fromRoleName(this, "BackendReleaseRole", CiStack.BACKEND_RELEASE_ROLE);
        releaseRole.addToPrincipalPolicy(PolicyStatement.Builder.create()
                .actions(List.of("ecs:DescribeServices", "ecs:UpdateService"))
                .resources(List.of(service.getServiceArn()))
                .build());
        releaseRole.addToPrincipalPolicy(PolicyStatement.Builder.create()
                .actions(List.of("iam:PassRole"))
                .resources(List.of(
                        service.getTaskDefinition().getTaskRole().getRoleArn(),
                        service.getTaskDefinition().obtainExecutionRole().getRoleArn()))
                .build());
    }

    public BackendService getBackend() {
        return backend;
    }
}
