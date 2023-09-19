import os
import subprocess

from compile import compile
from constants import OUT_STREAM

def process_graph(args):
    filepath = os.path.realpath(os.path.join(os.getcwd(), args.filepath[0]))
    output = os.path.realpath(os.path.join(os.getcwd(), args.output))

    gen_graph(filepath, output)


def gen_graph(filepath, output):
    print('Analysing...')
    compile(filepath, output)
    
    print('Generating...')
    arch_path = os.path.join(output, 'arch.yaml')
    dot_path = os.path.join(output, 'graph.dot')
    gen_dot(arch_path, dot_path)

    svg_path = os.path.join(output, 'graph.svg')
    cmd = 'dot -Tsvg {}'.format(dot_path)
    with open(svg_path, 'w') as f:
        p = subprocess.Popen(cmd.split(' '), stdout=f, stderr=OUT_STREAM)
        p.wait()
    print("Generated {}".format(svg_path))

    p = subprocess.Popen(f'open {svg_path}'.split(' '), stdout=OUT_STREAM)


def gen_dot(arch_path, outpath):
    env = os.environ.copy()
    cmd = 'npm run gendot {} {}'.format(arch_path, outpath)
    p = subprocess.Popen(cmd.split(' '), stdout=OUT_STREAM, env=env)
    p.wait()