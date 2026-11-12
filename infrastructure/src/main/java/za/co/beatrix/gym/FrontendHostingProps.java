package za.co.beatrix.gym;

import software.amazon.awscdk.services.apigatewayv2.HttpApi;
import software.amazon.awscdk.services.certificatemanager.ICertificate;

public record FrontendHostingProps(ICertificate certificate, HttpApi httpApi, Auth auth) {}
