from abc import ABC, abstractmethod


class Queue(ABC):
    @abstractmethod
    def push(self, item):
        pass
