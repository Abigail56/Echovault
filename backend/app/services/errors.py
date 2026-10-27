"""Domain errors raised by services and translated to HTTP responses in main.py.

Keeping HTTP details out of the services makes them easy to reuse and test.
"""


class ServiceError(Exception):
    status_code = 400

    def __init__(self, detail: str):
        super().__init__(detail)
        self.detail = detail


class NotFoundError(ServiceError):
    status_code = 404


class ConflictError(ServiceError):
    status_code = 409


class InvalidInputError(ServiceError):
    status_code = 422


class ServiceUnavailableError(ServiceError):
    status_code = 503
