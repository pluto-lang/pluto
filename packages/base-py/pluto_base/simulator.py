import json
import requests

SIM_HANDLE_PATH = "/call"


class SimulatorClient:
    def __init__(self, url, resourceId):
        self._url = url
        self._resourceId = resourceId

    def __getattr__(self, op):
        def function(*args):
            body = {"resourceId": self._resourceId, "op": op, "args": args}
            resp = requests.post(
                self._url + SIM_HANDLE_PATH,
                headers={"Content-Type": "application/json"},
                data=json.dumps(body),
            )
            parsed = resp.json()

            if "error" in parsed:
                raise Exception(parsed["error"])

            return parsed.get("result", None)

        return function


def make_simulator_client(url: str, resourceId: str):
    return SimulatorClient(url, resourceId)
