package za.co.beatrix.gym;

import java.util.Objects;
import software.amazon.awscdk.RemovalPolicy;
import software.amazon.awscdk.services.ec2.IVpc;
import software.amazon.awscdk.services.ec2.SubnetSelection;
import software.amazon.awscdk.services.rds.AuroraMysqlClusterEngineProps;
import software.amazon.awscdk.services.rds.AuroraMysqlEngineVersion;
import software.amazon.awscdk.services.rds.ClusterInstance;
import software.amazon.awscdk.services.rds.Credentials;
import software.amazon.awscdk.services.rds.DatabaseCluster;
import software.amazon.awscdk.services.rds.DatabaseClusterEngine;
import software.amazon.awscdk.services.secretsmanager.ISecret;
import software.constructs.Construct;

/** Aurora MySQL Serverless v2 that scales to zero ACUs when idle. */
public class Database extends Construct {

    static final String NAME = "gym_tracker";

    private final DatabaseCluster cluster;

    public Database(Construct scope, String id, IVpc vpc) {
        super(scope, id);
        this.cluster = DatabaseCluster.Builder.create(this, "Cluster")
                .engine(DatabaseClusterEngine.auroraMysql(AuroraMysqlClusterEngineProps.builder()
                        .version(AuroraMysqlEngineVersion.VER_3_08_0)
                        .build()))
                .vpc(vpc)
                .vpcSubnets(SubnetSelection.builder().subnetGroupName(Network.DB_SUBNET).build())
                .serverlessV2MinCapacity(0)
                .serverlessV2MaxCapacity(2)
                .writer(ClusterInstance.serverlessV2("writer"))
                .credentials(Credentials.fromGeneratedSecret("gymapp"))
                .defaultDatabaseName(NAME)
                .removalPolicy(RemovalPolicy.SNAPSHOT)
                .build();
    }

    public DatabaseCluster getCluster() {
        return cluster;
    }

    public ISecret getSecret() {
        return Objects.requireNonNull(cluster.getSecret(), "cluster was created with generated credentials");
    }
}
