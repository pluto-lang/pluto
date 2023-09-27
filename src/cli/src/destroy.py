import os
import subprocess

from models import Project, Stack
from config import get_project_config, save_project_config
from constants import LANG_ROOT, OUT_STREAM


def process_destroy(args):
    stack_name = args.stack
    proj = get_project_config()
    stack = proj.get_stack(stack_name)
    work_dirpath = '.pluto/output'

    if stack.engine == None:
        print('this stack is empty')
        exit(1)
    
    env = os.environ.copy()
    env['RUNTIME_TYPE'] = stack.runtime.type
    if stack.runtime.type == 'aws':
        env['AWS_REGION'] = stack.runtime.region
        env['AWS_ACCESS_KEY_ID'] = stack.runtime.account['access_key_id']
        env['AWS_SECRET_ACCESS_KEY'] = stack.runtime.account['secret_access_key']
    
    print('Destroying...')
    engine_down_mapping[stack.engine](proj, stack, env, work_dirpath)
    stack.engine = None
    save_project_config('.', proj)


def pulumi_down(proj: Project, stack: Stack, env, work_dirpath):
    cmd = 'bash {}/scripts/pulumi-basic.sh {} {} {} destroy'.format(LANG_ROOT, proj.name, stack.name, work_dirpath)
    p = subprocess.Popen(cmd.split(' '), env=env, stdout=OUT_STREAM, stderr=OUT_STREAM)
    p.wait()


def terraform_down(proj: Project, stack: Stack, env, work_dirpath):
    p = subprocess.Popen(f'terraform destroy -auto-approve'.split(' '), cwd=work_dirpath, stdout=OUT_STREAM, env=env)
    p.wait()
    

engine_down_mapping = {
    'pulumi': pulumi_down,
    'terraform': terraform_down,
}