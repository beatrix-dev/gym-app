package za.co.beatrix.gym;

import java.util.List;
import software.amazon.awscdk.Duration;
import software.amazon.awscdk.RemovalPolicy;
import software.amazon.awscdk.services.ec2.ISecurityGroup;
import software.amazon.awscdk.services.ec2.SecurityGroup;
import software.amazon.awscdk.services.ecs.Cluster;
import software.amazon.awscdk.services.iam.IRole;
import software.amazon.awscdk.services.iam.ManagedPolicy;
import software.amazon.awscdk.services.iam.Role;
import software.amazon.awscdk.services.iam.ServicePrincipal;
import software.amazon.awscdk.services.logs.LogGroup;
import software.amazon.awscdk.services.logs.RetentionDays;
import software.amazon.awscdk.services.servicediscovery.DnsRecordType;
import software.amazon.awscdk.services.servicediscovery.DnsServiceProps;
import software.amazon.awscdk.services.servicediscovery.HealthCheckCustomConfig;
import software.amazon.awscdk.services.servicediscovery.IService;
import software.amazon.awscdk.services.servicediscovery.PrivateDnsNamespace;
import software.constructs.Construct;

/**
 * The environment the FastAPI backend runs in: cluster, Cloud Map service (which API Gateway routes to), security
 * group, roles and log group. The ECS service and task definition are NOT here: the backend release owns them
 * (backend/deploy), so each has exactly one owner and nothing drifts. Releases register into this Cloud Map service.
 */
public class BackendService extends Construct {

    static final int PORT = 8100;
    static final String NAMESPACE = "gym.internal";
    static final String SERVICE_NAME = "backend";
    static final String LOG_GROUP = "/gym/backend";

    private final Cluster cluster;
    private final IService cloudMapService;
    private final SecurityGroup securityGroup;
    private final Role taskRole;
    private final Role executionRole;
    private final LogGroup logGroup;

    public BackendService(Construct scope, String id, BackendServiceProps props) {
        super(scope, id);

        this.cluster = Cluster.Builder.create(this, "Cluster").vpc(props.vpc()).build();

        PrivateDnsNamespace namespace = PrivateDnsNamespace.Builder.create(this, "Namespace")
                .name(NAMESPACE)
                .vpc(props.vpc())
                .build();
        // The same settings ECS uses when it creates a Cloud Map service itself: SRV records, so API Gateway learns
        // the task port, and health reported by ECS.
        this.cloudMapService = namespace.createService("Discovery", DnsServiceProps.builder()
                .name(SERVICE_NAME)
                .dnsRecordType(DnsRecordType.SRV)
                .dnsTtl(Duration.seconds(60))
                .customHealthCheck(HealthCheckCustomConfig.builder().failureThreshold(1).build())
                .build());

        this.securityGroup = SecurityGroup.Builder.create(this, "SecurityGroup")
                .vpc(props.vpc())
                .description("Backend Fargate tasks")
                .build();
        // Created from this side so the rule lives in this construct's stack; the other way round would make the
        // database stack depend on the backend stack, which already depends on it.
        securityGroup.getConnections().allowToDefaultPort(props.database().getCluster());

        this.logGroup = LogGroup.Builder.create(this, "Logs")
                .logGroupName(LOG_GROUP)
                .retention(RetentionDays.TWO_WEEKS)
                .removalPolicy(RemovalPolicy.DESTROY)
                .build();

        this.taskRole = Role.Builder.create(this, "TaskRole")
                .assumedBy(new ServicePrincipal("ecs-tasks.amazonaws.com"))
                .description("Backend container; the app itself needs no AWS permissions")
                .build();

        this.executionRole = Role.Builder.create(this, "ExecutionRole")
                .assumedBy(new ServicePrincipal("ecs-tasks.amazonaws.com"))
                .managedPolicies(List.of(
                        ManagedPolicy.fromAwsManagedPolicyName("service-role/AmazonECSTaskExecutionRolePolicy")))
                .description("Lets ECS pull the backend image, write logs and inject the database secret")
                .build();
        props.database().getSecret().grantRead(executionRole);
    }

    public Cluster getCluster() {
        return cluster;
    }

    public IService getCloudMapService() {
        return cloudMapService;
    }

    public ISecurityGroup getSecurityGroup() {
        return securityGroup;
    }

    public IRole getTaskRole() {
        return taskRole;
    }

    public IRole getExecutionRole() {
        return executionRole;
    }

    public LogGroup getLogGroup() {
        return logGroup;
    }
}
