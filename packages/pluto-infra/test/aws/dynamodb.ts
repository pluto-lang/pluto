import * as aws from "../../src/aws";

const db = new aws.DynamoKVStore("test-dynamodb");
db.postProcess();

export const { arn, name } = db;
