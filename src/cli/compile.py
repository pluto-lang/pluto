import os 
import subprocess


def process_compile(args):
    filepath = os.path.realpath(os.path.join(os.getcwd(), args.filepath[0]))
    output = os.path.realpath(os.path.join(os.getcwd(), args.output))

    compile(filepath, output)
    

def compile(filepath, output):
    cmd = 'npm run plutoc {} {} '.format(output, filepath)
    p = subprocess.Popen(cmd.split(' '))
    p.wait()