import { exec } from "child_process";

const daprSetupCmd = `/.dapr/bin/dapr --runtime-path / run --app-port 8080 --app-id pulumi-dapr --app-protocol http --dapr-http-port 3500`;

export async function setupDapr() {
    console.log(Date.now(), " start dapr");
    exec(daprSetupCmd, (error, stdout, stderr) => {
        if (error) {
            console.error(`error: ${error.message}`);
            return;
        }

        if (stderr) {
            console.error(`stderr: ${stderr}`);
            return;
        }

        console.log(`stdout:\n${stdout}`);
    });
}