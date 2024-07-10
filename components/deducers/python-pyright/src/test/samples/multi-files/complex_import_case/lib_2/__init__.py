from ..lib_1 import mod_1, mod_3 as mod_4
from ..lib_1.mod_2 import mod_2


def mod_5():
    mod_1()
    mod_2()
    mod_4()


__all__ = ["mod_5"]
