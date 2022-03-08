module.exports = class ErrorMessage {
  static ErrorType = {
    INVALID_CREDENTIALS: "Invalid credentials",
    INVALID_TOKEN: "Invalid token",
    NOT_AUTHORIZED: "Not authorized",
    NOT_FOUND: "Not found",
    SERVER_ERROR: "Server error",
    UNKNOWN: "Unknown error",
  };
};
