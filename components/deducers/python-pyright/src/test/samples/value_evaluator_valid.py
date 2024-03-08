from dataclasses import dataclass
from typing import Literal


@dataclass
class Base:
    name: str
    age: int


@dataclass
class Model:
    base: Base
    gender: Literal["male", "female"]
    nullable: int | None = None
    tup: tuple[int, int, int] = (1, 2, 3)


# Direct literal value evaluation
num_1 = 1
str_1 = "str1"
bool_1 = True
null_1 = None

num_2 = num_1 + 1
str_2 = str_1 + "str2" "str2_plus"


def fn_1(a: int, b: str, c: bool):
    pass


fn_1(num_2, b=str_1, c=bool_1)


# tuple value evaluation
num_tuple_1 = (1, 2, 3)
str_tuple_1 = ("str2", "str3", "str4")
bool_tuple_1 = (True, False, True)

mix_tuple_1 = (1, "str5", True)
nested_tuple_1 = ((1, 2), ("str6", "str7"), (True, False))
nested_mix_tuple_1 = ((1, "str8", True), (2, "str9", False))

"""
The reason the following expression isn't assigned to a variable is that if it were, the test case
would attempt to evaluate the variable's value. However, since the variable contains a data class
instance, and the value evaluator can't deduce the data class instance, the test case would fail.
"""
(Base(name="name", age=19), Base(name="name2", age=20))
(
    (1, "str10", True),
    (2, "str11", False),
    (3, "str12", Base(name="name3", age=21)),
)

# data class value evaluation
Model(base=Base("name", age=19), gender="male", nullable=null_1)
