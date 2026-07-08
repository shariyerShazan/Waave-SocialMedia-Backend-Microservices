export const KAFKA_BROKERS = process.env.KAFKA_BROKERS ?? 'localhost:9092';

export const KAFKA_CLIENT_IDS = {
  MAIN: 'main-kafka-client-id',
  AUTH: 'auth-kafka-client-id',
  USER: 'user-kafka-client-id',
  NOTIFICATION: 'notification-kafka-client-id',
} as const;

export const KAFKA_CONSUMER_GROUPS = {
  MAIN: 'kafka-consumer-group',
  AUTH: 'auth-service-group',
  USER: 'user-service-group',
  NOTIFICATION: 'notification-service-group',
} as const;

export const KAFKA_SERVICE = 'KAFKA_SERVICE';

//kafka topics
export const KAFKA_TOPICS = {
  //AUTH EVENTS
  USER_REGISTERED: 'user.registered',
  SEND_REGISTRATION_OTP: 'user.send-registration-otp',
  USER_LOGIN: 'user.login',
  USER_FORGOT_PASS_REQUEST: 'user.forgot-pass-request',

  // USER OR PROFILE
  USER_PROFILE_CREATED: 'user.profile-created',
  USER_PROFILE_UPDATED: 'user.profile-updated',
  USER_PROFILE_FOLLOWED: 'user.profile-followed',
  USER_PROFILE_UNFOLLOWED: 'user.profile-unfollowed',

  // post events
  POST_CREATED: 'post.created',
  POST_DELETED: 'post.deleted',
  POST_LIKED: 'post.liked',
  POST_COMMENTED: 'post.commented',
  POST_SHARED: 'post.shared',
};

export type KafkaTopics = (typeof KAFKA_TOPICS)[keyof typeof KAFKA_TOPICS];
