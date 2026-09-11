import { Test, TestingModule } from '@nestjs/testing';
import { EmailService } from '../email.service';
import nodemailer from 'nodemailer';

jest.mock('nodemailer');

describe('EmailService', () => {
  let service: EmailService;
  let mockTransporter: any;

  beforeEach(async () => {
    mockTransporter = {
      sendMail: jest.fn().mockResolvedValue({ messageId: 'msg-123' }),
    };

    (nodemailer.createTransport as jest.Mock).mockReturnValue(mockTransporter);

    const module: TestingModule = await Test.createTestingModule({
      providers: [EmailService],
    }).compile();

    service = module.get<EmailService>(EmailService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendRegistrationOtp', () => {
    it('should send registration OTP email with compiled template', async () => {
      const data = {
        email: 'user@example.com',
        name: 'John Doe',
        otp: '123456',
      };

      await service.sendRegistrationOtp(data);

      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'user@example.com',
          subject: 'Verify Your Account',
          html: expect.stringContaining('Hi John Doe'),
        }),
      );
      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          html: expect.stringContaining('123456'),
        }),
      );
    });
  });

  describe('sendForgotPasswordOtp', () => {
    it('should send forgot password OTP email with compiled template', async () => {
      const data = {
        email: 'user@example.com',
        name: 'Jane Doe',
        otp: '654321',
      };

      await service.sendForgotPasswordOtp(data);

      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'user@example.com',
          subject: 'Reset Your Password',
          html: expect.stringContaining('Hi Jane Doe'),
        }),
      );
      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          html: expect.stringContaining('654321'),
        }),
      );
    });
  });
});
