import os


def create_env_name_for_property(resource_id: str, property_name: str) -> str:
    env_name = f"{resource_id}_{property_name}".upper().replace(r"[^a-zA-Z0-9_]", "_")
    return env_name


def get_env_val_for_property(resource_id: str, property_name: str) -> str:
    env_name = create_env_name_for_property(resource_id, property_name)
    value = os.getenv(env_name)
    if value is None:
        raise ValueError(
            f"The environment variable '{env_name}', representing the value for '{property_name}' "
            f"associated with the '{resource_id}', cannot be located within the environment variables."
        )
    return value
