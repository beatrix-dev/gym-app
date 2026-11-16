package za.co.beatrix.gym;

/** SSM parameters that form the contract between the CDK stacks and the release workflows. CDK writes all of them. */
final class SsmNames {

    static final String PREFIX = "/gym/";

    static final String REPOSITORY_URI = PREFIX + "registry/repository-uri";
    static final String CLUSTER_NAME = PREFIX + "backend/cluster-name";
    static final String CLOUD_MAP_SERVICE_ARN = PREFIX + "backend/cloud-map-service-arn";
    static final String SECURITY_GROUP_ID = PREFIX + "backend/security-group-id";
    static final String SUBNET_IDS = PREFIX + "backend/subnet-ids";
    static final String TASK_ROLE_ARN = PREFIX + "backend/task-role-arn";
    static final String EXECUTION_ROLE_ARN = PREFIX + "backend/execution-role-arn";
    static final String LOG_GROUP_NAME = PREFIX + "backend/log-group-name";
    static final String DB_SECRET_ARN = PREFIX + "backend/db-secret-arn";
    static final String BUCKET_NAME = PREFIX + "frontend/bucket-name";
    static final String DISTRIBUTION_ID = PREFIX + "frontend/distribution-id";
    static final String USER_POOL_ID = PREFIX + "auth/user-pool-id";
    static final String CLIENT_ID = PREFIX + "auth/client-id";
    static final String COGNITO_DOMAIN = PREFIX + "auth/cognito-domain";

    private SsmNames() {}
}
