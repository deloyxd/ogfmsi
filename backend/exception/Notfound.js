 class NotFoundException extends Error {
  statusCode;

  constructor(msg, statusCode = 404) {
    super(msg);
    this.statusCode = statusCode;
  }
}
module.exports = NotFoundException;