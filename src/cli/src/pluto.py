#!/usr/bin/env python3

import argparse

from new import process_new
from compile import process_compile
from deploy import process_deploy
from destroy import process_destroy
from state import process_state


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

    destroyCmd = subparser.add_parser("destroy", help="Destroy the stack")
    destroyCmd.add_argument('-s', '--stack', default="dev", help="Target runtime (default: dev)")

    stateCmd = subparser.add_parser("state", help="Fetch or watch the resource state")
    stateCmd.add_argument('-s', '--stack', default="dev", help="Target runtime (default: dev)")
    
    args = parser.parse_args()
    if not args.subcmd:
        parser.print_help()
    else:
        process_command(args)


def process_command(args):
    cmd_handler_mapping = {
        'new': process_new,
        'compile': process_compile,
        'deploy': process_deploy,
        'destroy': process_destroy,
        'state': process_state
    }
    cmd_handler_mapping[args.subcmd](args)


if __name__ == '__main__':
    main()