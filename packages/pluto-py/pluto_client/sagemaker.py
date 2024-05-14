from dataclasses import dataclass
from enum import Enum
from typing import Any, Dict, Optional
from pluto_base.resource import (
    IResource,
    IResourceCapturedProps,
    IResourceClientApi,
    IResourceInfraApi,
)
from pluto_base.platform import PlatformType
from pluto_base import utils


class HuggingFaceTaskType(Enum):
    AUDIO_CLASSIFICATION = "audio-classification"
    AUTOMATIC_SPEECH_RECOGNITION = "automatic-speech-recognition"
    CONVERSATIONAL = "conversational"
    DEPTH_ESTIMATION = "depth-estimation"
    DOCUMENT_QUESTION_ANSWERING = "document-question-answering"
    FEATURE_EXTRACTION = "feature-extraction"
    FILL_MASK = "fill-mask"
    IMAGE_CLASSIFICATION = "image-classification"
    IMAGE_FEATURE_EXTRACTION = "image-feature-extraction"
    IMAGE_SEGMENTATION = "image-segmentation"
    IMAGE_TO_IMAGE = "image-to-image"
    IMAGE_TO_TEXT = "image-to-text"
    MASK_GENERATION = "mask-generation"
    OBJECT_DETECTION = "object-detection"
    QUESTION_ANSWERING = "question-answering"
    SUMMARIZATION = "summarization"
    TABLE_QUESTION_ANSWERING = "table-question-answering"
    TEXT2TEXT_GENERATION = "text2text-generation"
    TEXT_CLASSIFICATION = "text-classification"
    SENTIMENT_ANALYSIS = "sentiment-analysis"
    TEXT_GENERATION = "text-generation"
    TEXT_TO_AUDIO = "text-to-audio"
    TEXT_TO_SPEECH = "text-to-speech"
    TOKEN_CLASSIFICATION = "token-classification"
    NER = "ner"
    TRANSLATION = "translation"
    TRANSLATION_XX_TO_YY = "translation_xx_to_yy"
    VIDEO_CLASSIFICATION = "video-classification"
    VISUAL_QUESTION_ANSWERING = "visual-question-answering"
    ZERO_SHOT_CLASSIFICATION = "zero-shot-classification"
    ZERO_SHOT_IMAGE_CLASSIFICATION = "zero-shot-image-classification"
    ZERO_SHOT_AUDIO_CLASSIFICATION = "zero-shot-audio-classification"
    ZERO_SHOT_OBJECT_DETECTION = "zero-shot-object-detection"


@dataclass
class SageMakerOptions:
    # The member name must be camelCase to match the name in the infrastructure SDK.
    instanceType: str = "ml.m5.large"
    envs: Optional[Dict[str, Any]] = None


class ISageMakerRegularApi:
    @property
    def endpoint_name(self) -> str:
        raise NotImplementedError


class ISageMakerClientApi(IResourceClientApi):
    def invoke(self, input_data: Any) -> Any:
        raise NotImplementedError


class ISageMakerInfraApi(IResourceInfraApi):
    pass


class ISageMakerCapturedProps(IResourceCapturedProps):
    # The method name doesn't have to be CamelCase since it can correctly match environment variable
    # names in the implementation.
    def endpoint_url(self) -> str:
        raise NotImplementedError


class ISageMakerClient(
    ISageMakerClientApi, ISageMakerCapturedProps, ISageMakerRegularApi
):
    pass


class ISageMakerInfra(ISageMakerInfraApi, ISageMakerCapturedProps):
    pass


class SageMaker(IResource, ISageMakerClient, ISageMakerInfra):
    fqn = "@plutolang/pluto.SageMaker"

    def __init__(
        self, name: str, image_uri: str, opts: Optional[SageMakerOptions] = None
    ):
        raise NotImplementedError(
            "Cannot instantiate this class, instead of its subclass depending on the target runtime."
        )

    @staticmethod
    def build_client(
        name: str, image_uri: str, opts: Optional[SageMakerOptions] = None
    ) -> "ISageMakerClient":
        platform_type = utils.current_platform_type()
        if platform_type != PlatformType.AWS:
            raise NotImplementedError("SageMaker is only supported on AWS")
        from .clients import aws

        return aws.SageMaker(name, image_uri, opts)
