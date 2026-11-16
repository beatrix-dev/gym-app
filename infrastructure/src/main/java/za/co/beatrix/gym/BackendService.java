package za.co.beatrix.gym;

import java.util.List;
import java.util.Map;
import software.amazon.awscdk.Duration;
import software.amazon.awscdk.services.ec2.ISecurityGroup;
import software.amazon.awscdk.services.ec2.SecurityGroup;
import software.amazon.awscdk.services.ec2.SubnetSelection;
import software.amazon.awscdk.services.ecs.AwsLogDriverProps;
import software.amazon.awscdk.services.ecs.CloudMapOptions;
import software.amazon.awscdk.services.ecs.Cluster;
import software.amazon.awscdk.services.ecs.ContainerDefinitionOptions;
import software.amazon.awscdk.services.ecs.ContainerImage;
import software.amazon.awscdk.services.ecs.CpuArchitecture;
import software.amazon.awscdk.services.ecs.DeploymentCircuitBreaker;
import software.amazon.awscdk.services.ecs.FargateService;
import software.amazon.awscdk.services.ecs.FargateTaskDefinition;
import software.amazon.awscdk.services.ecs.HealthCheck;
import software.amazon.awscdk.services.ecs.LogDriver;
import software.amazon.awscdk.services.ecs.PortMapping;
import software.amazon.awscdk.services.ecs.RuntimePlatform;
import software.amazon.awscdk.services.ecs.Secret;
import software.amazon.awscdk.services.logs.RetentionDays;
import software.amazon.awscdk.services.servicediscovery.DnsRecordType;
import software.amazon.awscdk.services.servicediscovery.PrivateDnsNamespace;
import software.amazon.awscdk.services.ssm.StringParameter;
import software.constructs.Construct;

/**
 * The FastAPI backend on Fargate, registered in Cloud Map so API Gateway can reach it without a load balancer. The
 * image is not built here: the backend release workflow pushes it and records its tag in {@link SsmNames#IMAGE_TAG},
 * which CloudFormation reads at deploy time, so an infra deploy keeps the image that is running.
 */
public class BackendService extends Construct {

    static final int PORT = 8100;
    static final String NAMESPACE = "gym.internal";
    static final String SERVICE_NAME = "backend";

    private static final String HEALTH_URL = "http://localhost:" + PORT + "/api/health";

    private final FargateService service;
    private final ISecurityGroup securityGroup;

    public BackendService(Construct scope, String id, BackendServiceProps props) {
        super(scope, id);

        Cluster cluster = Cluster.Builder.create(this, "Cluster").vpc(props.vpc()).build();
        PrivateDnsNamespace namespace = PrivateDnsNamespace.Builder.create(this, "Namespace")
                .name(NAMESPACE)
                .vpc(props.vpc())
                .build();

        FargateTaskDefinition taskDefinition = FargateTaskDefinition.Builder.create(this, "TaskDef")
                .cpu(256)
                .memoryLimitMiB(512)
                .runtimePlatform(RuntimePlatform.builder()
                        .cpuArchitecture(CpuArchitecture.X86_64)
                        .build())
                .build();

        taskDefinition.addContainer("backend", ContainerDefinitionOptions.builder()
                .image(ContainerImage.fromEcrRepository(
                        props.repository(), StringParameter.valueForStringParameter(this, SsmNames.IMAGE_TAG)))
                .portMappings(List.of(PortMapping.builder().containerPort(PORT).build()))
                .logging(LogDriver.awsLogs(AwsLogDriverProps.builder()
                        .streamPrefix("backend")
                        .logRetention(RetentionDays.TWO_WEEKS)
                        .build()))
                .healthCheck(HealthCheck.builder()
                        .command(List.of(
                                "CMD",
                                "python",
                                "-c",
                                "import urllib.request;urllib.request.urlopen('" + HEALTH_URL + "')"))
                        .interval(Duration.seconds(30))
                        .timeout(Duration.seconds(5))
                        .retries(3)
                        .startPeriod(Duration.seconds(60))
                        .build())
                .secrets(Map.of(
                        "DB_HOST", Secret.fromSecretsManager(props.database().getSecret(), "host"),
                        "DB_PORT", Secret.fromSecretsManager(props.database().getSecret(), "port"),
                        "DB_USER", Secret.fromSecretsManager(props.database().getSecret(), "username"),
                        "DB_PASSWORD", Secret.fromSecretsManager(props.database().getSecret(), "password")))
                .environment(Map.of(
                        "DB_NAME", Database.NAME,
                        "COGNITO_REGION", GymApp.REGION,
                        "COGNITO_USER_POOL_ID", props.userPoolId(),
                        "COGNITO_CLIENT_ID", props.userPoolClientId()))
                .build());

        this.securityGroup = SecurityGroup.Builder.create(this, "SecurityGroup")
                .vpc(props.vpc())
                .description("Backend Fargate tasks")
                .build();

        this.service = FargateService.Builder.create(this, "Service")
                .cluster(cluster)
                .taskDefinition(taskDefinition)
                .securityGroups(List.of(securityGroup))
                .vpcSubnets(SubnetSelection.builder().subnetGroupName(Network.PUBLIC_SUBNET).build())
                .assignPublicIp(true)
                .desiredCount(1)
                .minHealthyPercent(100)
                .maxHealthyPercent(200)
                .circuitBreaker(DeploymentCircuitBreaker.builder().enable(true).rollback(true).build())
                .cloudMapOptions(CloudMapOptions.builder()
                        .cloudMapNamespace(namespace)
                        .name(SERVICE_NAME)
                        .dnsRecordType(DnsRecordType.SRV)
                        .containerPort(PORT)
                        .build())
                .build();
        // The container migrates the database on start, so it must not start until the writer instance (a child
        // of the cluster construct) exists; depending on the secret alone only waits for the cluster.
        service.getNode().addDependency(props.database().getCluster());

        // Created from this side so the rule lives in this construct's stack; the other way round would make the
        // database stack depend on the backend stack, which already depends on it.
        securityGroup.getConnections().allowToDefaultPort(props.database().getCluster());
    }

    public FargateService getService() {
        return service;
    }

    public ISecurityGroup getSecurityGroup() {
        return securityGroup;
    }
}
