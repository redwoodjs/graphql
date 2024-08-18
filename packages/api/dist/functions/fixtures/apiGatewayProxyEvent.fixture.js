"use strict";

var _Object$defineProperty = require("@babel/runtime-corejs3/core-js/object/define-property");
_Object$defineProperty(exports, "__esModule", {
  value: true
});
exports.mockedAPIGatewayProxyEvent = exports.default = void 0;
const mockedAPIGatewayProxyEvent = exports.mockedAPIGatewayProxyEvent = {
  body: 'MOCKED_BODY',
  headers: {},
  multiValueHeaders: {},
  httpMethod: 'POST',
  isBase64Encoded: false,
  path: '/MOCK_PATH',
  pathParameters: null,
  queryStringParameters: null,
  multiValueQueryStringParameters: null,
  stageVariables: null,
  requestContext: {
    accountId: 'MOCKED_ACCOUNT',
    apiId: 'MOCKED_API_ID',
    authorizer: {
      name: 'MOCKED_AUTHORIZER'
    },
    protocol: 'HTTP',
    identity: {
      accessKey: null,
      accountId: null,
      apiKey: null,
      apiKeyId: null,
      caller: null,
      clientCert: null,
      cognitoAuthenticationProvider: null,
      cognitoAuthenticationType: null,
      cognitoIdentityId: null,
      cognitoIdentityPoolId: null,
      principalOrgId: null,
      sourceIp: '123.123.123.123',
      user: null,
      userAgent: null,
      userArn: null
    },
    httpMethod: 'POST',
    path: '/MOCK_PATH',
    stage: 'MOCK_STAGE',
    requestId: 'MOCKED_REQUEST_ID',
    requestTimeEpoch: 1,
    resourceId: 'MOCKED_RESOURCE_ID',
    resourcePath: 'MOCKED_RESOURCE_PATH'
  },
  resource: 'MOCKED_RESOURCE'
};
var _default = exports.default = mockedAPIGatewayProxyEvent;