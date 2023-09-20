import os
import yaml

from models import Project


def get_project_config() -> Project:
    with open(os.path.join(os.getcwd(), '.pluto/Pluto.yaml'), 'r') as f:
        proj = yaml.load(f.read(), Loader=yaml.UnsafeLoader)
    return proj


def save_project_config(proj_dir, proj):
    os.makedirs(os.path.join(proj_dir, '.pluto'), exist_ok=True)
    with open(os.path.join(proj_dir, '.pluto/Pluto.yaml'), "w+") as f:
        text = yaml.dump(proj, sort_keys=False)
        # text = re.sub('!!python.*', '', text)
        # text = re.sub('^(\s*)\n', '', text)
        # text = re.sub('-(\s*)\n(\s*)', '- ', text)
        f.write(text)