import os
import sys
import subprocess

from compile import compile
from constants import LANG_ROOT


def process_deploy(args):
    filepath = os.path.realpath(os.path.join(os.getcwd(), args.filepath[0]))
    output = os.path.realpath(os.path.join(os.getcwd(), args.output))
    target = args.target
    
    deploy(filepath, output)


def deploy(filepath, output):
    print('Compiling...')
    compile(filepath, output)

    print('Deploying...')
    cmd = 'bash {}/scripts/deploy.sh {} {}'.format(LANG_ROOT, filepath, output)
    p = subprocess.Popen(cmd.split(' '))
    p.wait()

    p = subprocess.Popen('pulumi stack output -s staging'.split(' '), cwd=output, stdout=sys.stdout)
    p.wait()