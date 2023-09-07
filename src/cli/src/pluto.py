#!/usr/bin/env python3

import argparse

from new import process_new
from compile import process_compile
from deploy import process_deploy


def main(): 
    parser = argparse.ArgumentParser(prog='pluto')
    
    subparser = parser.add_subparsers(dest="subcmd", title="subcmd")

    applyCmd = subparser.add_parser("deploy", help="Deploy the application to runtime")
    applyCmd.add_argument('filepath', nargs='*', help="Path to application source code (defalut: main.ts)", default=["main.ts"])
    applyCmd.add_argument('-s', '--stack', default="dev", help="Target runtime (default: dev)")
    applyCmd.add_argument('--output', help="Path to output files", default=".pluto/output")

    compileCmd = subparser.add_parser("compile", help="Compile the application source code to CIR and PIR")
    compileCmd.add_argument('filepath', nargs=1, help="Path to application source code")
    compileCmd.add_argument('--output', help="Path to output files", default=".pluto/output")

    newCmd = subparser.add_parser("new", help="Create a new project in the current directory")
    
    args = parser.parse_args()
    if not args.subcmd:
        parser.print_help()
    else:
        process_command(args)


def process_command(args):
    if args.subcmd == 'new':
        process_new(args)
    if args.subcmd == 'compile':
        process_compile(args)
    elif args.subcmd == 'deploy':
        process_deploy(args)


if __name__ == '__main__':
    main()