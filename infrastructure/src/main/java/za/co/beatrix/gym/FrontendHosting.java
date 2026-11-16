package za.co.beatrix.gym;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.util.List;
import java.util.Map;
import software.amazon.awscdk.Fn;
import software.amazon.awscdk.RemovalPolicy;
import software.amazon.awscdk.services.cloudfront.AllowedMethods;
import software.amazon.awscdk.services.cloudfront.BehaviorOptions;
import software.amazon.awscdk.services.cloudfront.CachePolicy;
import software.amazon.awscdk.services.cloudfront.Distribution;
import software.amazon.awscdk.services.cloudfront.Function;
import software.amazon.awscdk.services.cloudfront.FunctionAssociation;
import software.amazon.awscdk.services.cloudfront.FunctionCode;
import software.amazon.awscdk.services.cloudfront.FunctionEventType;
import software.amazon.awscdk.services.cloudfront.FunctionRuntime;
import software.amazon.awscdk.services.cloudfront.OriginProtocolPolicy;
import software.amazon.awscdk.services.cloudfront.OriginRequestPolicy;
import software.amazon.awscdk.services.cloudfront.ViewerProtocolPolicy;
import software.amazon.awscdk.services.cloudfront.origins.HttpOrigin;
import software.amazon.awscdk.services.cloudfront.origins.HttpOriginProps;
import software.amazon.awscdk.services.cloudfront.origins.S3BucketOrigin;
import software.amazon.awscdk.services.s3.BlockPublicAccess;
import software.amazon.awscdk.services.s3.Bucket;
import software.amazon.awscdk.services.s3.IBucket;
import software.constructs.Construct;

/**
 * Private S3 bucket behind one CloudFront distribution: the SPA by default, /api/* forwarded to the HTTP API. The
 * files, including config.json, are uploaded by the frontend release workflow, not by CDK.
 */
public class FrontendHosting extends Construct {

    private static final String SPA_REWRITE_RESOURCE = "/spa-rewrite.js";

    private final Bucket bucket;
    private final Distribution distribution;

    public FrontendHosting(Construct scope, String id, FrontendHostingProps props) {
        super(scope, id);

        this.bucket = Bucket.Builder.create(this, "Bucket")
                .blockPublicAccess(BlockPublicAccess.BLOCK_ALL)
                .enforceSsl(true)
                .removalPolicy(RemovalPolicy.DESTROY)
                .autoDeleteObjects(true)
                .build();

        Function spaRewrite = Function.Builder.create(this, "SpaRewrite")
                .runtime(FunctionRuntime.JS_2_0)
                .code(FunctionCode.fromInline(readResource(SPA_REWRITE_RESOURCE)))
                .build();

        HttpOrigin apiOrigin = new HttpOrigin(
                Fn.select(2, Fn.split("/", props.httpApi().getApiEndpoint())),
                HttpOriginProps.builder()
                        .protocolPolicy(OriginProtocolPolicy.HTTPS_ONLY)
                        .build());

        this.distribution = Distribution.Builder.create(this, "Distribution")
                .domainNames(List.of(GymApp.DOMAIN))
                .certificate(props.certificate())
                .defaultRootObject("index.html")
                .defaultBehavior(BehaviorOptions.builder()
                        .origin(S3BucketOrigin.withOriginAccessControl(bucket))
                        .viewerProtocolPolicy(ViewerProtocolPolicy.REDIRECT_TO_HTTPS)
                        .functionAssociations(List.of(FunctionAssociation.builder()
                                .function(spaRewrite)
                                .eventType(FunctionEventType.VIEWER_REQUEST)
                                .build()))
                        .build())
                .additionalBehaviors(Map.of(
                        "/api/*",
                        BehaviorOptions.builder()
                                .origin(apiOrigin)
                                .viewerProtocolPolicy(ViewerProtocolPolicy.REDIRECT_TO_HTTPS)
                                .allowedMethods(AllowedMethods.ALLOW_ALL)
                                .cachePolicy(CachePolicy.CACHING_DISABLED)
                                .originRequestPolicy(OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER)
                                .build()))
                .build();
    }

    public IBucket getBucket() {
        return bucket;
    }

    public Distribution getDistribution() {
        return distribution;
    }

    private static String readResource(String name) {
        try (var in = FrontendHosting.class.getResourceAsStream(name)) {
            if (in == null) {
                throw new IllegalStateException("Missing classpath resource " + name);
            }
            return new String(in.readAllBytes());
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }
}
