package za.co.beatrix.gym;

import software.amazon.awscdk.Stack;
import software.amazon.awscdk.StackProps;
import software.amazon.awscdk.services.apigatewayv2.HttpApi;
import software.amazon.awscdk.services.ssm.StringParameter;
import software.constructs.Construct;

/**
 * API Gateway in front of the backend. New endpoints need no change here: the catch-all route forwards every
 * /api/... request to FastAPI. Change this stack only for gateway rules (public routes, limits, domains, CORS).
 */
public class ApiStack extends Stack {

    private final Api api;

    public ApiStack(Construct scope, String id, StackProps props, ApiProps apiProps) {
        super(scope, id, props);
        this.api = new Api(this, "Api", apiProps);
        // Smoke tests call the API directly, so they work before (or without) the app domain's DNS.
        StringParameter.Builder.create(this, "ApiUrlParameter")
                .parameterName(SsmNames.API_URL)
                .stringValue(api.getHttpApi().getApiEndpoint())
                .build();
    }

    public HttpApi getHttpApi() {
        return api.getHttpApi();
    }
}
