import os
import yaml


def get_project_config():
    with open(os.path.join(os.getcwd(), '.pluto/Pluto.yaml'), 'r') as f:
        proj = yaml.load(f.read(), Loader=yaml.UnsafeLoader)
    return proj