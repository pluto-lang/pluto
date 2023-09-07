import os 
import subprocess

from constants import OUT_STREAM

# plutoc_cmd = 'ts-node /Users/zhengsj/code/pluto-lang/src/plutoc/ts/index.ts'
plutoc_cmd = "npm run plutoc"

def process_compile(args):
    filepath = os.path.realpath(os.path.join(os.getcwd(), args.filepath[0]))
    output = os.path.realpath(os.path.join(os.getcwd(), args.output))

    print("Compiling...")
    compile(filepath, output)
    print("Done")
    

def compile(filepath, output):
    env = os.environ.copy()
    cmd = '{} {} {}'.format(plutoc_cmd, output, filepath)
    p = subprocess.Popen(cmd.split(' '), stdout=OUT_STREAM, env=env)
    p.wait()