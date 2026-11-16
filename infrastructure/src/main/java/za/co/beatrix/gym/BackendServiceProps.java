package za.co.beatrix.gym;

import software.amazon.awscdk.services.ec2.IVpc;
import software.amazon.awscdk.services.ecr.IRepository;

public record BackendServiceProps(
        IVpc vpc, Database database, String userPoolId, String userPoolClientId, IRepository repository) {}
