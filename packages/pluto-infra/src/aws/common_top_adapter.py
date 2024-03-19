import os
import sys

# We've placed the dependent modules in the child directory, but the interpreter isn't aware of
# their location. Therefore, we include the child directory in the system path.
current_directory = os.path.dirname(os.path.abspath(__file__))
depth = 0
child_directory = os.path.join(current_directory, f"child_{depth}")
while os.path.exists(child_directory):
    print(f"Adding {child_directory} to the system path.")
    sys.path.append(child_directory)
    depth += 1
    child_directory = os.path.join(child_directory, f"child_{depth}")


def handler(*args, **kwargs):
    inner_handler = globals()["__handler_"]
    return inner_handler(*args, **kwargs)
