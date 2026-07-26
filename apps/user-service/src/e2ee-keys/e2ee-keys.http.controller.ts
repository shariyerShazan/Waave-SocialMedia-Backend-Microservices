import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { E2eeKeysService } from './e2ee-keys.service';
import {
  RefillOneTimePreKeysDto,
  RegisterDeviceDto,
  RotateSignedPreKeyDto,
  UploadKeysDto,
} from '@app/common/dto/e2ee/e2ee-keys.dto';

@ApiTags('E2EE Keys')
@Controller('e2ee/keys')
export class E2eeKeysHttpController {
  constructor(private readonly keys: E2eeKeysService) {}

  @Post('devices/:userId')
  @ApiOperation({ summary: 'Register a device for E2EE' })
  @ApiBody({ type: RegisterDeviceDto })
  registerDevice(
    @Param('userId') userId: string,
    @Body() dto: RegisterDeviceDto,
  ) {
    return this.keys.registerDevice({ userId, ...dto });
  }

  @Get('devices/:userId')
  @ApiOperation({ summary: 'List active devices' })
  listDevices(@Param('userId') userId: string) {
    return this.keys.listDevices(userId);
  }

  @Delete('devices/:userId/:deviceId')
  @ApiOperation({ summary: 'Revoke a device' })
  revokeDevice(
    @Param('userId') userId: string,
    @Param('deviceId') deviceId: string,
  ) {
    return this.keys.revokeDevice(userId, deviceId);
  }

  @Post('upload/:userId')
  @ApiOperation({ summary: 'Upload identity, signed, and one-time prekeys' })
  @ApiBody({ type: UploadKeysDto })
  uploadKeys(@Param('userId') userId: string, @Body() dto: UploadKeysDto) {
    return this.keys.uploadKeys({
      userId,
      deviceId: dto.deviceId,
      identityKey: dto.identityKey,
      signedPreKey: dto.signedPreKey,
      oneTimePreKeys: dto.oneTimePreKeys,
    });
  }

  @Post('rotate-signed/:userId')
  @ApiOperation({ summary: 'Rotate signed prekey' })
  @ApiBody({ type: RotateSignedPreKeyDto })
  rotateSignedPreKey(
    @Param('userId') userId: string,
    @Body() dto: RotateSignedPreKeyDto,
  ) {
    return this.keys.rotateSignedPreKey({
      userId,
      deviceId: dto.deviceId,
      signedPreKey: dto.signedPreKey,
    });
  }

  @Post('refill/:userId')
  @ApiOperation({ summary: 'Refill one-time prekeys' })
  @ApiBody({ type: RefillOneTimePreKeysDto })
  refill(
    @Param('userId') userId: string,
    @Body() dto: RefillOneTimePreKeysDto,
  ) {
    return this.keys.refillOneTimePreKeys({
      userId,
      deviceId: dto.deviceId,
      oneTimePreKeys: dto.oneTimePreKeys,
    });
  }

  @Get('bundle/:targetUserId')
  @ApiOperation({ summary: 'Get Signal-style key bundle (consumes one OTK)' })
  getKeyBundle(
    @Param('targetUserId') targetUserId: string,
    @Query('requesterId') requesterId: string,
    @Query('deviceId') deviceId?: string,
  ) {
    return this.keys.getKeyBundle(targetUserId, requesterId || '', deviceId);
  }

  @Get('otk-count/:userId/:deviceId')
  @ApiOperation({ summary: 'Count remaining one-time prekeys' })
  countOtk(
    @Param('userId') userId: string,
    @Param('deviceId') deviceId: string,
  ) {
    return this.keys.countOneTimePreKeys(userId, deviceId);
  }
}
