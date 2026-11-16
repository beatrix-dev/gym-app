package za.co.beatrix.gym;

import software.amazon.awscdk.Stack;
import software.amazon.awscdk.StackProps;
import software.amazon.awscdk.services.ec2.IVpc;
import software.constructs.Construct;

/** Aurora Serverless v2. Holds state, so the stack has termination protection (set in {@link GymStacks}). */
public class DatabaseStack extends Stack {

    private final Database database;

    public DatabaseStack(Construct scope, String id, StackProps props, IVpc vpc) {
        super(scope, id, props);
        this.database = new Database(this, "Database", vpc);
    }

    public Database getDatabase() {
        return database;
    }
}
