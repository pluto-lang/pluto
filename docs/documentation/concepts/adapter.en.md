Adapters for various operating platforms interact with the platform through APIs, IaC engines, and other means to complete resource creation, querying, updating, and destruction. One distinction between Adapters and Deducers or Generators is that Adapters may contain states, such as `tf.state` files.

## Inputs

- Project information, such as name
- State directory
- Arch ref
- IaC code files

## Operations

- Deploy: Deploy to the target platform
  - Output: List of resources deployed on the target platform
- State: Current state of the project on the target platform
  - Output: List of resources deployed on the target platform
- Destroy: Destroy the application on the target platform
  - Output: None
