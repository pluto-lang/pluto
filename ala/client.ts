import { DaprClient, CommunicationProtocolEnum } from "@dapr/dapr";

const daprHost = "127.0.0.1"; // Dapr Host
const daprPort = "3500";      // Dapr Port of this Example Server

export default function getClient() {
    return new DaprClient({ daprHost, daprPort });
}