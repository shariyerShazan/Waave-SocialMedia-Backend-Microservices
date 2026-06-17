/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Injectable } from '@nestjs/common';
import nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  async sendRegistrationOtp(data: {
    email: string;
    name: string;
    otp: string;
  }) {
    const htmlTemplate = `
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>Verify your account</title>
    <style>
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial;
        background: #f6f9fc;
        margin: 0;
        padding: 20px;
      }
      .card {
        max-width: 600px;
        margin: 32px auto;
        background: #ffffff;
        border-radius: 10px;
        box-shadow: 0 4px 18px rgba(0, 0, 0, 0.08);
        overflow: hidden;
      }
      .header {
        background: linear-gradient(90deg, #4f46e5, #06b6d4);
        padding: 28px 32px;
        color: #fff;
      }
      .logo {
        font-weight: 700;
        font-size: 18px;
      }
      .content {
        padding: 28px 32px;
        color: #1f2937;
      }
      .greeting {
        font-size: 18px;
        margin: 0 0 8px 0;
      }
      .lead {
        color: #4b5563;
        margin: 0 0 18px 0;
      }
      .otp {
        display: inline-block;
        padding: 14px 20px;
        background: #f3f4f6;
        border-radius: 8px;
        font-weight: 700;
        font-size: 22px;
        letter-spacing: 4px;
        margin: 12px 0;
      }
      .footer {
        padding: 20px 32px;
        color: #6b7280;
        font-size: 13px;
      }
      .small {
        font-size: 12px;
        color: #9ca3af;
      }
    </style>
  </head>
  <body>
    <div class="card">
      <div class="header">
        <div class="logo">My App</div>
      </div>
      <div class="content">
        <p class="greeting">Hi {{name}},</p>
        <p class="lead">
          Thanks for creating an account. Use the code below to verify your
          email address. This code will expire shortly.
        </p>
        <div class="otp">{{otp}}</div>
        <p class="lead">
          If you didn't request this, you can safely ignore this email.
        </p>
        <p class="small">
          Need help? Reply to this email and we'll get back to you.
        </p>
      </div>
      <div class="footer">
        &copy; <span id="year">2026</span> My App — Built with care.
      </div>
    </div>
  </body>
</html>
  `;
    const html = htmlTemplate
      .replace('{{name}}', data.name)
      .replace('{{otp}}', data.otp);

    await this.transporter.sendMail({
      from: `"My App" <${process.env.SMTP_USER}>`,
      to: data.email,
      subject: 'Verify Your Account',
      html,
    });
  }

  async sendForgotPasswordOtp(data: {
    email: string;
    name: string;
    otp: string;
  }) {
    const htmlTemplate = `
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>Reset your password</title>
    <style>
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial;
        background: #f6f9fc;
        margin: 0;
        padding: 20px;
      }
      .card {
        max-width: 600px;
        margin: 32px auto;
        background: #ffffff;
        border-radius: 10px;
        box-shadow: 0 4px 18px rgba(0, 0, 0, 0.08);
        overflow: hidden;
      }
      .header {
        background: linear-gradient(90deg, #ef4444, #f59e0b); /* লাল/কমলা গ্রেডিয়েন্ট সিকিউরিটির জন্য */
        padding: 28px 32px;
        color: #fff;
      }
      .logo {
        font-weight: 700;
        font-size: 18px;
      }
      .content {
        padding: 28px 32px;
        color: #1f2937;
      }
      .greeting {
        font-size: 18px;
        margin: 0 0 8px 0;
      }
      .lead {
        color: #4b5563;
        margin: 0 0 18px 0;
      }
      .otp {
        display: inline-block;
        padding: 14px 20px;
        background: #f3f4f6;
        border-radius: 8px;
        font-weight: 700;
        font-size: 22px;
        letter-spacing: 4px;
        margin: 12px 0;
      }
      .footer {
        padding: 20px 32px;
        color: #6b7280;
        font-size: 13px;
      }
      .small {
        font-size: 12px;
        color: #9ca3af;
      }
    </style>
  </head>
  <body>
    <div class="card">
      <div class="header">
        <div class="logo">My App</div>
      </div>
      <div class="content">
        <p class="greeting">Hi {{name}},</p>
        <p class="lead">
          We received a request to reset the password for your account. 
          Use the verification code below to proceed with the password reset. 
          This code will expire shortly.
        </p>
        <div class="otp">{{otp}}</div>
        <p class="lead">
          If you didn't request a password reset, you can safely ignore this email and your password will remain unchanged.
        </p>
        <p class="small">
          Need help? Reply to this email and we'll get back to you.
        </p>
      </div>
      <div class="footer">
        &copy; <span id="year">2026</span> My App — Built with care.
      </div>
    </div>
  </body>
</html>
  `;
    const html = htmlTemplate
      .replace('{{name}}', data.name)
      .replace('{{otp}}', data.otp);

    await this.transporter.sendMail({
      from: `"My App" <${process.env.SMTP_USER}>`,
      to: data.email,
      subject: 'Reset Your Password',
      html,
    });
  }
}
