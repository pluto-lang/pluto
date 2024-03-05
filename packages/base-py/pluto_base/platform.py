from enum import Enum


class PlatformType(Enum):
    AWS = "AWS"
    K8s = "K8s"
    Azure = "Azure"
    GCP = "GCP"
    AliCloud = "AliCloud"
    Simulator = "Simulator"
    Custom = "Custom"
