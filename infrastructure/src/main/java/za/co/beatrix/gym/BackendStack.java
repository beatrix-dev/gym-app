package za.co.beatrix.gym;

import java.util.List;
import software.amazon.awscdk.Stack;
import software.amazon.awscdk.StackProps;
import software.amazon.awscdk.services.ec2.SubnetSelection;
import software.amazon.awscdk.services.iam.IRole;
import software.amazon.awscdk.services.iam.PolicyStatement;
import software.amazon.awscdk.services.iam.Role;
import software.amazon.awscdk.services.ssm.StringParameter;
import software.constructs.Construct;

/**
 * The backend's environment. Deploys with no image and no running task. Publishes everything the backend release
 * (.github/scripts/release-backend.sh) needs, and lets the backend release role create and update services in this
 * cluster only.
 */
public class BackendStack extends Stack {

    private final BackendService backend;

    public BackendStack(Construct scope, String id, StackProps props, BackendServiceProps backendProps) {
        super(scope, id, props);
        this.backend = new BackendService(this, "Backend", backendProps);

        String subnetIds = String.join(
                ",",
                backendProps.vpc()
                        .selectSubnets(SubnetSelection.builder().subnetGroupName(Network.PUBLIC_SUBNET).build())
                        .getSubnetIds());

        parameter("ClusterNameParameter", SsmNames.CLUSTER_NAME, backend.getCluster().getClusterName());
        parameter(
                "CloudMapServiceArnParameter",
                SsmNames.CLOUD_MAP_SERVICE_ARN,
                backend.getCloudMapService().getServiceArn());
        parameter(
                "SecurityGroupIdParameter",
                SsmNames.SECURITY_GROUP_ID,
                backend.getSecurityGroup().getSecurityGroupId());
        parameter("SubnetIdsParameter", SsmNames.SUBNET_IDS, subnetIds);
        parameter("TaskRoleArnParameter", SsmNames.TASK_ROLE_ARN, backend.getTaskRole().getRoleArn());
        parameter("ExecutionRoleArnParameter", SsmNames.EXECUTION_ROLE_ARN, backend.getExecutionRole().getRoleArn());
        parameter("LogGroupNameParameter", SsmNames.LOG_GROUP_NAME, backend.getLogGroup().getLogGroupName());
        parameter("DbSecretArnParameter", SsmNames.DB_SECRET_ARN, backendProps.database().getSecret().getSecretArn());

        IRole releaseRole = Role.fromRoleName(this, "BackendReleaseRole", CiStack.BACKEND_RELEASE_ROLE);
        releaseRole.addToPrincipalPolicy(PolicyStatement.Builder.create()
                .actions(List.of("ecs:CreateService", "ecs:DescribeServices", "ecs:UpdateService"))
                .resources(List.of("arn:aws:ecs:" + getRegion() + ":" + getAccount() + ":service/"
                        + backend.getCluster().getClusterName() + "/*"))
                .build());
        releaseRole.addToPrincipalPolicy(PolicyStatement.Builder.create()
                .actions(List.of("iam:PassRole"))
                .resources(List.of(
                        backend.getTaskRole().getRoleArn(), backend.getExecutionRole().getRoleArn()))
                .build());
    }

    public BackendService getBackend() {
        return backend;
    }

    private void parameter(String id, String name, String value) {
        StringParameter.Builder.create(this, id).parameterName(name).stringValue(value).build();
    }
}
