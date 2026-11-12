package za.co.beatrix.gym;

import software.amazon.awscdk.Stack;
import software.amazon.awscdk.StackProps;
import software.amazon.awscdk.services.certificatemanager.Certificate;
import software.amazon.awscdk.services.certificatemanager.CertificateValidation;
import software.amazon.awscdk.services.certificatemanager.ICertificate;
import software.constructs.Construct;

/**
 * CloudFront only accepts ACM certificates from us-east-1, so the certificate lives in its own stack.
 * DNS is managed outside Route 53, so validation records are added manually.
 */
public class CertificateStack extends Stack {

    private final ICertificate certificate;

    public CertificateStack(Construct scope, String id, StackProps props, String domainName) {
        super(scope, id, props);
        this.certificate = Certificate.Builder.create(this, "Certificate")
                .domainName(domainName)
                .validation(CertificateValidation.fromDns())
                .build();
    }

    public ICertificate getCertificate() {
        return certificate;
    }
}
