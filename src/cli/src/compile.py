import os 
import subprocess

from constants import OUT_STREAM


def process_compile(args):
    filepath = os.path.realpath(os.path.join(os.getcwd(), args.filepath[0]))
    output = os.path.realpath(os.path.join(os.getcwd(), args.output))

    print("Compiling...")
    compile(filepath, output)

    arch_path = os.path.join(output, 'arch.yaml')
    static_ir_path = os.path.join(output, 'static')
    gen_ir(arch_path, static_ir_path)
    print("Done")
    

def compile(filepath, output):
    env = os.environ.copy()
    cmd = 'npm run plutoc {} {}'.format(output, filepath)
    p = subprocess.Popen(cmd.split(' '), stdout=OUT_STREAM, env=env)
    p.wait()


def gen_ir(arch_path, output):
    env = os.environ.copy()
    cmd = 'npm run genir {} {}'.format(arch_path, output)
    p = subprocess.Popen(cmd.split(' '), stdout=OUT_STREAM, env=env)
    p.wait()