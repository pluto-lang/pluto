import pluto_client

from utils_1 import hello_world
from utils_2 import world
from lib_1 import mod_1, mod_2, mod_3
from lib_2 import mod_5


def handler():
    hello_world()
    world()
    mod_1()
    mod_2()
    mod_3()
    mod_5()
