package za.co.beatrix.gym;

import software.amazon.awscdk.services.ec2.IVpc;

public record BackendServiceProps(
        IVpc vpc, Database database, String userPoolId, String userPoolClientId, String allowedEmails) {}
