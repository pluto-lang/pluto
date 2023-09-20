import os
import sys
import subprocess

from config import get_project_config


def process_state(args):
    stack_name = args.stack
    proj = get_project_config()
    stack = proj.get_stack(stack_name)
    work_dirpath = '.pluto/output'

    if stack.engine == None:
        print('This stack has no resources.')
        exit(0)

    env = os.environ.copy()
    env['AWS_REGION'] = stack.runtime.region
    env['AWS_ACCESS_KEY_ID'] = stack.runtime.account['access_key_id']
    env['AWS_SECRET_ACCESS_KEY'] = stack.runtime.account['secret_access_key']

    state_mapping[stack.engine](proj, stack, work_dirpath, env)


def print_state(proj, stack, work_dirpath, env):
    p = subprocess.run(f'pulumi stack -s {stack.name}'.split(' '), cwd=work_dirpath, env=env, capture_output=True, text=True)
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
    

def terraform_state(proj, stack, work_dirpath, env):
    p = subprocess.Popen('terraform show'.split(' '), cwd=work_dirpath, env=env, stdout=sys.stdout)
    p.wait()


state_mapping = {
    'pulumi': print_state,
    'terraform': terraform_state
}