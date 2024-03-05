from enum import Enum


class ProvisionType(Enum):
    Pulumi = "Pulumi"
    Terraform = "Terraform"
    Simulator = "Simulator"
    Custom = "Custom"
