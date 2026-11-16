package za.co.beatrix.gym;

import software.amazon.awscdk.App;

/** Builds the whole app the same way {@link GymApp} does, with a fixed test account. */
final class TestStacks {

    static final String ACCOUNT = "123456789012";

    private TestStacks() {}

    static GymStacks create() {
        return GymStacks.create(new App(), ACCOUNT);
    }
}
