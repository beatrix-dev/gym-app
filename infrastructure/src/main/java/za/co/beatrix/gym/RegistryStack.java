package za.co.beatrix.gym;

import java.util.List;
import software.amazon.awscdk.Stack;
import software.amazon.awscdk.StackProps;
import software.amazon.awscdk.services.ecr.IRepository;
import software.amazon.awscdk.services.ecr.LifecycleRule;
import software.amazon.awscdk.services.ecr.Repository;
import software.amazon.awscdk.services.ecr.TagMutability;
import software.amazon.awscdk.services.iam.IRole;
import software.amazon.awscdk.services.iam.Role;
import software.amazon.awscdk.services.ssm.StringParameter;
import software.constructs.Construct;

/**
 * The backend image repository. It is its own stack because an image must be in it before the backend service can
 * start, and rebuilding the backend stack must not delete the images that rollbacks use.
 */
public class RegistryStack extends Stack {

    static final String REPOSITORY_NAME = "gym-backend";
    /** How many images are kept, so there is a range of releases to roll back to. */
    static final int IMAGES_KEPT = 20;

    private final Repository repository;

    public RegistryStack(Construct scope, String id, StackProps props) {
        super(scope, id, props);

        this.repository = Repository.Builder.create(this, "Repository")
                .repositoryName(REPOSITORY_NAME)
                .imageTagMutability(TagMutability.IMMUTABLE)
                .lifecycleRules(List.of(LifecycleRule.builder().maxImageCount(IMAGES_KEPT).build()))
                .build();

        StringParameter.Builder.create(this, "RepositoryUriParameter")
                .parameterName(SsmNames.REPOSITORY_URI)
                .stringValue(repository.getRepositoryUri())
                .build();

        IRole releaseRole = Role.fromRoleName(this, "BackendReleaseRole", CiStack.BACKEND_RELEASE_ROLE);
        repository.grantPullPush(releaseRole);
        repository.grant(releaseRole, "ecr:DescribeImages");
    }

    public IRepository getRepository() {
        return repository;
    }
}
