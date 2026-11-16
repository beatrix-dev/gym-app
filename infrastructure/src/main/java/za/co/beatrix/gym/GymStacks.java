package za.co.beatrix.gym;

import software.amazon.awscdk.App;
import software.amazon.awscdk.Environment;
import software.amazon.awscdk.StackProps;

/** Every stack in the app and the references between them. Used by {@link GymApp} and by the tests. */
public record GymStacks(
        CertificateStack certificate,
        CiStack ci,
        NetworkStack network,
        DatabaseStack database,
        AuthStack auth,
        RegistryStack registry) {

    public static GymStacks create(App app, String account) {
        CertificateStack certificate = new CertificateStack(
                app, "GymCertificate", props(account, GymApp.CERTIFICATE_REGION, false), GymApp.DOMAIN);
        CiStack ci = new CiStack(app, "GymCi", props(account, GymApp.REGION, false), GymApp.GITHUB_REPO);
        NetworkStack network = new NetworkStack(app, "GymNetwork", props(account, GymApp.REGION, false));
        DatabaseStack database =
                new DatabaseStack(app, "GymDatabase", props(account, GymApp.REGION, true), network.getVpc());
        AuthStack auth = new AuthStack(app, "GymAuth", props(account, GymApp.REGION, true));
        RegistryStack registry = new RegistryStack(app, "GymRegistry", props(account, GymApp.REGION, false));
        return new GymStacks(certificate, ci, network, database, auth, registry);
    }

    private static StackProps props(String account, String region, boolean terminationProtection) {
        return StackProps.builder()
                .env(Environment.builder().account(account).region(region).build())
                .crossRegionReferences(true)
                .terminationProtection(terminationProtection)
                .build();
    }
}
