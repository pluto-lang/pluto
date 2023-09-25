import os
import sys
import subprocess

dir_path = os.path.dirname(os.path.realpath(__file__))
LANG_ROOT = os.path.realpath(os.path.join(dir_path, '../../../'))

DEBUG = False
OUT_STREAM = sys.stdout if DEBUG else subprocess.DEVNULL