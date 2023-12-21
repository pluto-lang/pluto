import * as aws from "../../src/aws";

const que = new aws.SNSQueue("test-sns");
que.postProcess();

export const { name, arn } = que.topic;
