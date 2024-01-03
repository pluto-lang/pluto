The functionality of each generator may vary. Some may generate Infrastructure as Code (IaC) scripts, while others may generate resource topology diagrams. However, they all create outputs based on the Architecture Reference (Arch Ref) and save them to a specified directory.

The official release includes two generators:

1. Graphviz Generator: This generates a dot file based on the Arch Ref.
2. TS Provision Generator: This generates IaC scripts in combination with the Infrastructure SDK based on the Arch Ref.

## Inputs

- Architecture Reference (Arch Ref)
- Computed Closure Collection
- Output directory

## Output

- Entry file of all generated files
