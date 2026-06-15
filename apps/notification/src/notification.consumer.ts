import { Controller } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { EmailService } from './email/email.service';
import { KAFKA_TOPICS } from '@app/kafka';

@Controller()
export class NotificationConsumer {
  constructor(private readonly emailService: EmailService) {}

  @EventPattern(KAFKA_TOPICS.USER_REGISTERED)
  async handleUserRegistered(
    @Payload() data: { email: string; name: string; otp: string },
  ) {
    try {
      await this.emailService.sendRegistrationOtp({
        email: data.email,
        name: data.name,
        otp: data.otp,
      });
    } catch (err) {
      console.error('Failed to send OTP email', err);
    }
  }

  @EventPattern(KAFKA_TOPICS.USER_FORGOT_PASS_REQUEST)
  async handleForgotPassword(
    @Payload() data: { email: string; name: string; otp: string },
  ) {
    try {
      await this.emailService.sendForgotPasswordOtp({
        email: data.email,
        name: data.name,
        otp: data.otp,
      });
    } catch (err) {
      console.error('Failed to send OTP email', err);
    }
  }
}
