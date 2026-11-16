package za.co.beatrix.gym;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import org.junit.jupiter.api.Test;
import software.amazon.awscdk.App;
import software.amazon.awscdk.Stack;

class GymStacksTest {

    private final App app = new App();
    private final GymStacks stacks = GymStacks.create(app, TestStacks.ACCOUNT);

    @Test
    void createsTheNineStacks() {
        assertEquals(
                Set.of(
                        "GymCertificate", "GymCi", "GymNetwork", "GymDatabase", "GymAuth",
                        "GymRegistry", "GymBackend", "GymApi", "GymFrontend"),
                allStacks().stream().map(Stack::getStackName).collect(Collectors.toSet()));
    }

    @Test
    void wholeAppSynthesizesWithoutCycles() {
        assertDoesNotThrow(() -> app.synth());
    }

    @Test
    void onlyDatabaseAndAuthHaveTerminationProtection() {
        assertEquals(
                Set.of("GymDatabase", "GymAuth"),
                allStacks().stream()
                        .filter(Stack::getTerminationProtection)
                        .map(Stack::getStackName)
                        .collect(Collectors.toSet()));
    }

    private List<Stack> allStacks() {
        return app.getNode().getChildren().stream()
                .filter(Stack.class::isInstance)
                .map(Stack.class::cast)
                .toList();
    }
}
