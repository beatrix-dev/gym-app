package za.co.beatrix.gym;

import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.Map;
import org.junit.jupiter.api.Test;
import software.amazon.awscdk.assertions.Match;
import software.amazon.awscdk.assertions.Template;

class DatabaseStackTest {

    private final GymStacks stacks = TestStacks.create();
    private final Template template = Template.fromStack(stacks.database());

    @Test
    void auroraServerlessV2ScalesToZero() {
        template.hasResourceProperties(
                "AWS::RDS::DBCluster",
                Match.objectLike(Map.of(
                        "Engine", "aurora-mysql",
                        "StorageEncrypted", true,
                        "ServerlessV2ScalingConfiguration", Map.of("MinCapacity", 0, "MaxCapacity", 2))));
    }

    @Test
    void databaseInstanceIsNotPubliclyAccessible() {
        template.hasResourceProperties(
                "AWS::RDS::DBInstance",
                Match.objectLike(Map.of("DBInstanceClass", "db.serverless", "PubliclyAccessible", false)));
    }

    @Test
    void hasTerminationProtection() {
        assertTrue(stacks.database().getTerminationProtection());
    }
}
