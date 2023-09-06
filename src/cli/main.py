#!/usr/bin/env python3

import argparse

from compile import process_compile
from deploy import process_deploy


def main(): 
    parser = argparse.ArgumentParser(prog='pluto')
    
    subparser = parser.add_subparsers(dest="subcmd", title="subcmd")

    applyCmd = subparser.add_parser("deploy", help="Deploy the application to runtime")
    applyCmd.add_argument('filepath', nargs=1, help="Path to application source code")
    applyCmd.add_argument('--target', default="aws", help="Target runtime (default: aws)")
    applyCmd.add_argument('--output', help="Path to output files")

    compileCmd = subparser.add_parser("compile", help="Compile the application source code to CIR and PIR")
    compileCmd.add_argument('filepath', nargs=1, help="Path to application source code")
    compileCmd.add_argument('--output', help="Path to output files")
    
    args = parser.parse_args()
    if not args.subcmd:
        parser.print_help()
    else:
        process_command(args)


def process_command(args):
    if args.subcmd == 'compile':
        process_compile(args)
    elif args.subcmd == 'deploy':
        process_deploy(args)


if __name__ == '__main__':
    main()