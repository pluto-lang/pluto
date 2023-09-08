import os
import subprocess

from models import Project
from config import get_project_config
from constants import LANG_ROOT, OUT_STREAM


def process_destroy(args):
    stack = args.stack
    proj = get_project_config()

    destroy(proj, stack)


def destroy(proj: Project, stack_name):
    print('Destroying...')
    env = os.environ.copy()
    # TODO: get stack by stack_name
    env['AWS_REGION'] = proj.stacks[0].runtime.region
    env['AWS_ACCESS_KEY_ID'] = proj.stacks[0].runtime.account['access_key_id']
    env['AWS_SECRET_ACCESS_KEY'] = proj.stacks[0].runtime.account['secret_access_key']
    cmd = 'bash {}/scripts/pulumi-basic.sh {} {} destroy'.format(LANG_ROOT, proj.name, stack_name)
    p = subprocess.Popen(cmd.split(' '), env=env, stdout=OUT_STREAM, stderr=OUT_STREAM)
    p.wait()