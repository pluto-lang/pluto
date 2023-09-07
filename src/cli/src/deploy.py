import os
import sys
import subprocess

from models import Project
from config import get_project_config
from compile import compile
from constants import LANG_ROOT, OUT_STREAM


def process_deploy(args):
    filepath = os.path.realpath(os.path.join(os.getcwd(), args.filepath[0]))
    output = os.path.realpath(os.path.join(os.getcwd(), args.output))
    stack = args.stack
    
    proj = get_project_config()
    deploy(proj, stack, filepath, output)


def deploy(proj: Project, stack_name, filepath, output):
    print('Compiling...')
    compile(filepath, output)

    print('Building...')
    env = os.environ.copy()
    # TODO: get stack by stack_name
    env['AWS_REGION'] = proj.stacks[0].runtime.region
    env['AWS_ACCESS_KEY_ID'] = proj.stacks[0].runtime.account['access_key_id']
    env['AWS_SECRET_ACCESS_KEY'] = proj.stacks[0].runtime.account['secret_access_key']
    cmd = 'bash {}/scripts/build.sh {} {} {} {}'.format(LANG_ROOT, proj.name, stack_name, filepath, output)
    p = subprocess.Popen(cmd.split(' '), env=env, stdout=OUT_STREAM, stderr=OUT_STREAM)
    p.wait()

    print('Deploying...')
    p = subprocess.Popen(f'pulumi up -s {stack_name} -y -f'.split(' '), cwd=output, stdout=OUT_STREAM)
    p.wait()

    print('\nOutput:')
    p = subprocess.Popen(f'pulumi stack output -s {stack_name}'.split(' '), cwd=output, stdout=sys.stdout)
    p.wait()