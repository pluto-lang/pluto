import * as aws from "../../src/aws";

const router = new aws.ApiGatewayRouter("hello");

export const { url } = router;
