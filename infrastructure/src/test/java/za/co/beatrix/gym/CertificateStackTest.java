package za.co.beatrix.gym;

import static org.junit.jupiter.api.Assertions.assertNotNull;

import java.util.Map;
import org.junit.jupiter.api.Test;
import software.amazon.awscdk.App;
import software.amazon.awscdk.Environment;
import software.amazon.awscdk.StackProps;
import software.amazon.awscdk.assertions.Match;
import software.amazon.awscdk.assertions.Template;

class CertificateStackTest {

    private static final String DOMAIN = "app.beatrix.co.za";

    private final CertificateStack stack = new CertificateStack(
            new App(),
            "TestCertificate",
            StackProps.builder()
                    .env(Environment.builder().account("123456789012").region("us-east-1").build())
                    .build(),
            DOMAIN);
    private final Template template = Template.fromStack(stack);

    @Test
    void createsSingleDnsValidatedCertificateForDomain() {
        template.resourceCountIs("AWS::CertificateManager::Certificate", 1);
        template.hasResourceProperties(
                "AWS::CertificateManager::Certificate",
                Map.of("DomainName", DOMAIN, "ValidationMethod", "DNS"));
    }

    @Test
    void doesNotAutomateValidationThroughHostedZone() {
        template.hasResourceProperties(
                "AWS::CertificateManager::Certificate",
                Match.objectLike(Map.of("DomainValidationOptions", Match.absent())));
    }

    @Test
    void exposesCertificate() {
        assertNotNull(stack.getCertificate());
    }
}
