import os
from pluto_base import simulator


def create_simulator_client(resource_id: str):
    simulator_url = os.getenv("PLUTO_SIMULATOR_URL")
    if simulator_url is None:
        raise Exception("PLUTO_SIMULATOR_URL doesn't exist")
    return simulator.make_simulator_client(simulator_url, resource_id)
