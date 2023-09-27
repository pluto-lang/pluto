import os
import sys
import subprocess

from models import Project, Stack
from config import get_project_config, save_project_config
from compile import compile, gen_ir
from constants import LANG_ROOT, OUT_STREAM


def process_deploy(args):
    filepath = os.path.realpath(os.path.join(os.getcwd(), args.filepath[0]))
    output = os.path.realpath(os.path.join(os.getcwd(), args.output))
    stack_name = args.stack
    engine = args.engine
    
    proj = get_project_config()
    stack = proj.get_stack(stack_name)
    deploy(proj, stack, engine, filepath, output)


def deploy(proj: Project, stack: Stack, engine, filepath, output):
    if engine not in engine_up_mapping:
        print(f'not support this engine `{engine}`')
        exit(1)
    
    print('Compiling...')
    compile(filepath, output)
    arch_path = os.path.join(output, 'arch.yaml')
    gen_ir(arch_path, output)
    
    env = os.environ.copy()
    env['RUNTIME_TYPE'] = stack.runtime.type
    if stack.runtime.type == 'aws':
        env['AWS_REGION'] = stack.runtime.region
        env['AWS_ACCESS_KEY_ID'] = stack.runtime.account['access_key_id']
        env['AWS_SECRET_ACCESS_KEY'] = stack.runtime.account['secret_access_key']
    
    print('Building...')
    cmd = 'bash {}/scripts/build.sh {} {} {} {}'.format(LANG_ROOT, proj.name, stack.name, filepath, output)
    p = subprocess.Popen(cmd.split(' '), env=env, stdout=OUT_STREAM, stderr=OUT_STREAM)
    p.wait()

    print('Deploying...')
    engine_up_mapping[engine](proj, stack, env, output)
    stack.engine = engine
    save_project_config('.', proj)


def pulumi_up(proj: Project, stack: Stack, env, output):
    cmd = 'bash {}/scripts/pulumi-basic.sh {} {} {} up'.format(LANG_ROOT, proj.name, stack.name, output)
    p = subprocess.Popen(cmd.split(' '), env=env, stdout=OUT_STREAM, stderr=OUT_STREAM)
    p.wait()

    print('\nOutput:')
    p = subprocess.Popen(f'pulumi stack output -s {stack.name}'.split(' '), cwd=output, stdout=sys.stdout, env=env)
    p.wait()


def terraform_up(proj: Project, stack: Stack, env, output):
    p = subprocess.Popen(f'terraform init'.split(' '), cwd=output, stdout=OUT_STREAM, env=env)
    p.wait()
    if p.returncode != 0:
        print('terraform init failed')
        exit(1)
    
    p = subprocess.Popen(f'terraform apply -auto-approve'.split(' '), cwd=output, stdout=OUT_STREAM, env=env)
    p.wait()
    if p.returncode != 0:
        print('terraform init failed')
        exit(1)

    print('\nOutput:')
    p = subprocess.Popen(f'terraform output'.split(' '), cwd=output, stdout=sys.stdout, env=env)
    p.wait()


engine_up_mapping = {
    'pulumi': pulumi_up,
    'terraform': terraform_up
}