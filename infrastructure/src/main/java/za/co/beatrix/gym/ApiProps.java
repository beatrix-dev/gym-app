package za.co.beatrix.gym;

import software.amazon.awscdk.services.cognito.IUserPool;
import software.amazon.awscdk.services.cognito.IUserPoolClient;
import software.amazon.awscdk.services.ec2.IVpc;

public record ApiProps(IVpc vpc, BackendService backend, IUserPool userPool, IUserPoolClient client) {}
