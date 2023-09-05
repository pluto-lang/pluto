import * as aws from "@pulumi/aws"
const bucketName = "bucket";
const bucket = new aws.s3.Bucket(bucketName)
bucket.onObjectCreated("event-handler", async () => {
    console.log("create an object");
})


import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
const client = new S3Client();
client.send(new PutObjectCommand({
    Bucket: bucketName,
    Key: "all",
    Body: "test",
}))