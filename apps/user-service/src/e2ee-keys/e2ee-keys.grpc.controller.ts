import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { E2eeKeysService } from './e2ee-keys.service';

@Controller()
export class E2eeKeysGrpcController {
  constructor(private readonly keys: E2eeKeysService) {}

  @GrpcMethod('UserService', 'RegisterDevice')
  registerDevice(data: {
    userId: string;
    deviceId: string;
    deviceName: string;
    platform: string;
    osVersion?: string;
    appVersion?: string;
  }) {
    return this.keys.registerDevice(data);
  }

  @GrpcMethod('UserService', 'ListDevices')
  listDevices(data: { userId: string }) {
    return this.keys.listDevices(data.userId);
  }

  @GrpcMethod('UserService', 'RevokeDevice')
  revokeDevice(data: { userId: string; deviceId: string }) {
    return this.keys.revokeDevice(data.userId, data.deviceId);
  }

  @GrpcMethod('UserService', 'UploadKeys')
  uploadKeys(data: {
    userId: string;
    deviceId: string;
    identityKey: { publicKey: string; registrationId: number };
    signedPreKey: { keyId: number; publicKey: string; signature: string };
    oneTimePreKeys: Array<{ keyId: number; publicKey: string }>;
  }) {
    return this.keys.uploadKeys(data);
  }

  @GrpcMethod('UserService', 'RotateSignedPreKey')
  rotateSignedPreKey(data: {
    userId: string;
    deviceId: string;
    signedPreKey: { keyId: number; publicKey: string; signature: string };
  }) {
    return this.keys.rotateSignedPreKey(data);
  }

  @GrpcMethod('UserService', 'RefillOneTimePreKeys')
  refillOneTimePreKeys(data: {
    userId: string;
    deviceId: string;
    oneTimePreKeys: Array<{ keyId: number; publicKey: string }>;
  }) {
    return this.keys.refillOneTimePreKeys(data);
  }

  @GrpcMethod('UserService', 'GetKeyBundle')
  getKeyBundle(data: {
    targetUserId: string;
    deviceId?: string;
    requesterId: string;
  }) {
    return this.keys.getKeyBundle(
      data.targetUserId,
      data.requesterId,
      data.deviceId,
    );
  }

  @GrpcMethod('UserService', 'GetKeyBundlesForUsers')
  getKeyBundlesForUsers(data: { userIds: string[]; requesterId: string }) {
    return this.keys.getKeyBundlesForUsers(data.userIds, data.requesterId);
  }

  @GrpcMethod('UserService', 'CountOneTimePreKeys')
  countOneTimePreKeys(data: { userId: string; deviceId: string }) {
    return this.keys.countOneTimePreKeys(data.userId, data.deviceId);
  }
}
