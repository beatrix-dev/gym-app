package za.co.beatrix.gym;

import software.amazon.awscdk.Stack;
import software.amazon.awscdk.StackProps;
import software.amazon.awscdk.services.cloudfront.Distribution;
import software.amazon.awscdk.services.iam.IRole;
import software.amazon.awscdk.services.iam.Role;
import software.amazon.awscdk.services.ssm.StringParameter;
import software.constructs.Construct;

/**
 * Frontend hosting. Publishes the bucket and distribution, and lets the frontend release role upload files and clear
 * the CloudFront cache.
 */
public class FrontendStack extends Stack {

    private final FrontendHosting hosting;

    public FrontendStack(Construct scope, String id, StackProps props, FrontendHostingProps hostingProps) {
        super(scope, id, props);
        this.hosting = new FrontendHosting(this, "Frontend", hostingProps);

        StringParameter.Builder.create(this, "BucketNameParameter")
                .parameterName(SsmNames.BUCKET_NAME)
                .stringValue(hosting.getBucket().getBucketName())
                .build();
        StringParameter.Builder.create(this, "DistributionIdParameter")
                .parameterName(SsmNames.DISTRIBUTION_ID)
                .stringValue(hosting.getDistribution().getDistributionId())
                .build();

        IRole releaseRole = Role.fromRoleName(this, "FrontendReleaseRole", CiStack.FRONTEND_RELEASE_ROLE);
        hosting.getBucket().grantReadWrite(releaseRole);
        hosting.getDistribution().grantCreateInvalidation(releaseRole);
    }

    public Distribution getDistribution() {
        return hosting.getDistribution();
    }
}
