package za.co.beatrix.gym;

/**
 * SSM parameters that form the contract between the CDK stacks and the release workflows. CDK writes all of them
 * except {@link #IMAGE_TAG}, which only the backend release workflow writes.
 */
final class SsmNames {

    static final String PREFIX = "/gym/";

    static final String REPOSITORY_URI = PREFIX + "registry/repository-uri";
    static final String CLUSTER_NAME = PREFIX + "backend/cluster-name";
    static final String SERVICE_NAME = PREFIX + "backend/service-name";
    static final String IMAGE_TAG = PREFIX + "backend/image-tag";
    static final String BUCKET_NAME = PREFIX + "frontend/bucket-name";
    static final String DISTRIBUTION_ID = PREFIX + "frontend/distribution-id";
    static final String USER_POOL_ID = PREFIX + "auth/user-pool-id";
    static final String CLIENT_ID = PREFIX + "auth/client-id";
    static final String COGNITO_DOMAIN = PREFIX + "auth/cognito-domain";

    private SsmNames() {}
}
