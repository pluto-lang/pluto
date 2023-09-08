import os
import subprocess

from config import get_project_config
from constants import LANG_ROOT


def process_state(args):
    stack = args.stack
    proj = get_project_config()

    print_state(proj, stack)


def print_state(proj, stack_name):
    env = os.environ.copy()
    # TODO: get stack by stack_name
    env['AWS_REGION'] = proj.stacks[0].runtime.region
    env['AWS_ACCESS_KEY_ID'] = proj.stacks[0].runtime.account['access_key_id']
    env['AWS_SECRET_ACCESS_KEY'] = proj.stacks[0].runtime.account['secret_access_key']
    cmd = 'bash {}/scripts/pulumi-basic.sh {} {} state'.format(LANG_ROOT, proj.name, stack_name)

    p = subprocess.run(cmd.split(' '), env=env, capture_output=True, text=True)
    lines = p.stdout.split('\n')
    
    resource_info = ''
    captured = False
    for line in lines:
        if line.startswith('Current stack resources'):
            captured = True
        elif line.startswith('More information at'):
            captured = False
        
        if captured and line.strip() != '':
            resource_info += line + '\n'
    print(resource_info[:-1])
    