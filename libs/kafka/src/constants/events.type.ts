export interface UserRegisteredEvent {
  userId: string;
  email: string;
  name: string;
}

export interface SendRegistrationOtpEvent {
  email: string;
  name: string;
  otp: string;
}

export interface SendResetPassOtpEvent {
  email: string;
  name: string;
  otp: string;
}

export interface UserFollowEvent {
  followerId: string;
  targetId: string;
  followerName: string;
}

export interface UserUnfollowEvent {
  followerId: string;
  targetId: string;
  followerName: string;
}
