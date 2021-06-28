/**
 * Content-Type: multipart/form-data を扱うAPIハンドラ
 */
public with sharing class MultiPartFormHandler {
  // Helper enum indicating how a file's base64 padding was replaced.
  public enum EndingType {Cr, CrLf, None}
  // 任意の区切り文字
  private final static String FIX_BOUNDARY = '1ff13444ed8140c7a32fc4e6451aa76d';

  public static HttpResponse uploadFileToCloudSign(String contractName, String fileName, Blob fileData, String endPoint, Integer timeOut, String token) {
    // adding documents metadata or properties
    String form64 = append('name', contractName);
    // adding documents body with file parameter
    Blob formBlob = makeBlobWithFile('uploadfile', fileName, fileData, form64);

    HttpRequest req = new HttpRequest();
    req.setBodyAsBlob(formBlob);
    req.setMethod('POST');

    if (timeOut != null) {
      req.setTimeout(timeOut);
    }
    req.setHeader('Content-Type', 'multipart/form-data; charset="UTF-8"; boundary="' + FIX_BOUNDARY + '"');
    req.setHeader('Accept', 'application/json');
    req.setHeader('Authorization', 'Bearer ' + token);
    req.setEndpoint(endPoint);
    Http http = new Http();
    return http.send(req);
  }

  /**
   *  Pad the value with spaces until the base64 encoding is no longer padded.
   */
  public static String safelyPad(String value, String valueCrLf64, String lineBreaks) {
    String valueCrLf = '';
    Blob valueCrLfBlob = null;

    while (valueCrLf64.endsWith('=')) {
      value += ' ';
      valueCrLf = value + lineBreaks;
      valueCrLfBlob = Blob.valueOf(valueCrLf);
      valueCrLf64 = EncodingUtil.base64Encode(valueCrLfBlob);
    }
    return valueCrLf64;
  }

  /**
   *  Write a boundary between parameters to the form's body.
   */
  public static String writeBoundary() {
    String value = '--' + FIX_BOUNDARY + '\r\n';
    Blob valueBlob = Blob.valueOf(value);
    return EncodingUtil.base64Encode(valueBlob);
  }

  /**
   *  Write a boundary at the end of the form's body.
   */
  public static String writeBoundary(EndingType ending) {
    String value = '';

    if (ending == EndingType.Cr) {
      // The file's base64 was padded with a single '=',
      // so it was replaced with '\r'. Now we have to
      // prepend the boundary with '\n' to complete
      // the line break.
      value += '\n';
    } else if (ending == EndingType.None) {
      // The file's base64 was not padded at all,
      // so we have to prepend the boundary with
      // '\r\n' to create the line break.
      value += '\r\n';
    }
    // Else:
    // The file's base64 was padded with a double '=',
    // so they were replaced with '\r\n'. We don't have to
    // do anything to the boundary because there's a complete
    // line break before it.
    value += '--' + FIX_BOUNDARY + '--';
    Blob valueBlob = Blob.valueOf(value);

    return EncodingUtil.base64Encode(valueBlob);
  }

  /**
   *  Write a key-value pair to the form's body.
   */
  public static String writeBodyParameter(String key, String value) {
    String contentDisposition = 'Content-Disposition: form-data; name="' + key + '"';
    Blob contentDispositionCrLfBlob = Blob.valueOf(contentDisposition + '\r\n\r\n');
    String contentDispositionCrLf64 = EncodingUtil.base64Encode(contentDispositionCrLfBlob);
    String content = safelyPad(contentDisposition, contentDispositionCrLf64, '\r\n\r\n');
    Blob valueCrLfBlob = Blob.valueOf(value + '\r\n');
    String valueCrLf64 = EncodingUtil.base64Encode(valueCrLfBlob);
    content += safelyPad(value, valueCrLf64, '\r\n');

    return content;
  }

  public static String writeFileBody(String key, Blob attachBody, String filename) {
    String header =
      '--' + FIX_BOUNDARY + '\r\n' +
      'Content-Type: application/pdf\r\n'+
      'Content-Disposition: form-data; name="' + key + '";filename="' + filename + '"';

    String headerEncoded = EncodingUtil.base64Encode(Blob.valueOf(header + '\r\n\r\n'));
    while (headerEncoded.endsWith('=')) {
      header += ' ';
      headerEncoded = EncodingUtil.base64Encode(Blob.valueOf(header+'\r\n\r\n'));
    }
    String footer = '--' + FIX_BOUNDARY + '--';
    String bodyEncoded = EncodingUtil.base64Encode(attachBody);
    return headerEncoded+bodyEncoded;
  }

  /**
   * this method will work for only parameters in the form data
   */
  public static String append(String key, String value) {
    return writeBoundary() + writeBodyParameter(key, value);
  }

  /**
   * this method will work for file parameters and other params in the form data
   */
  public static Blob makeBlobWithFile(String key, String filename, Blob attachBody, String otherParamsEncoded) {
    String header =
      '--' + FIX_BOUNDARY + '\r\n' +
      'Content-Type: application/pdf\r\n' +
      'Content-Disposition: form-data; name="' + key + '";filename="' + filename + '"';

    String headerEncoded = EncodingUtil.base64Encode(Blob.valueOf(header + '\r\n\r\n'));
    while (headerEncoded.endsWith('=')) {
      header += ' ';
      headerEncoded = EncodingUtil.base64Encode(Blob.valueOf(header+'\r\n\r\n'));
    }
    String footer = '--' + FIX_BOUNDARY + '--';
    String bodyEncoded = EncodingUtil.base64Encode(attachBody);
    Blob formBlob = null;
    String last4Bytes = bodyEncoded.substring(bodyEncoded.length()-4, bodyEncoded.length());

    if (last4Bytes.endsWith('==')) {
      last4Bytes = last4Bytes.substring(0,2) + '0K';
      bodyEncoded = bodyEncoded.substring(0, bodyEncoded.length()-4) + last4Bytes;
      String footerEncoded = EncodingUtil.base64Encode(Blob.valueOf(footer));
      return EncodingUtil.base64Decode(otherParamsEncoded + headerEncoded + bodyEncoded + footerEncoded);

    } else if (last4Bytes.endsWith('=')) {
      last4Bytes = last4Bytes.substring(0,3) + 'N';
      bodyEncoded = bodyEncoded.substring(0, bodyEncoded.length()-4) + last4Bytes;
      footer = '\n' + footer;
      String footerEncoded = EncodingUtil.base64Encode(Blob.valueOf(footer));
      return EncodingUtil.base64Decode(otherParamsEncoded + headerEncoded + bodyEncoded + footerEncoded);

    } else {
      footer = '\r\n' + footer;
      String footerEncoded = EncodingUtil.base64Encode(Blob.valueOf(footer));
      return EncodingUtil.base64Decode(otherParamsEncoded + headerEncoded + bodyEncoded + footerEncoded);
    }
  }
}