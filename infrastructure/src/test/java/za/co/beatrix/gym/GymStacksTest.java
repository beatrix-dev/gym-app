package za.co.beatrix.gym;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import org.junit.jupiter.api.Test;
import software.amazon.awscdk.App;
import software.amazon.awscdk.Stack;
import software.amazon.awscdk.assertions.Template;

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

    @Test
    @SuppressWarnings("unchecked")
    void noTwoStacksAttachAPolicyWithTheSameNameToTheSameRole() {
        // IAM inline policy names are unique per role; CDK names a policy on an imported role after its construct
        // path, so two stacks importing a role under the same id collide at deploy time, not at synth time.
        Set<String> seen = new java.util.HashSet<>();
        for (Stack stack : allStacks()) {
            for (Map<String, Object> policy : Template.fromStack(stack).findResources("AWS::IAM::Policy").values()) {
                Map<String, Object> properties = (Map<String, Object>) policy.get("Properties");
                for (Object role : (List<Object>) properties.get("Roles")) {
                    if (role instanceof String roleName) {
                        String key = roleName + "/" + properties.get("PolicyName");
                        assertTrue(seen.add(key), "duplicate inline policy " + key + " (in " + stack.getStackName() + ")");
                    }
                }
            }
        }
    }

    private List<Stack> allStacks() {
        return app.getNode().getChildren().stream()
                .filter(Stack.class::isInstance)
                .map(Stack.class::cast)
                .toList();
    }
}
